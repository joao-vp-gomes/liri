// frontend/src/pages/CodexPage/entryWindows/RecipeWindow.tsx


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';
import { dbFetch, dbRegister, dbDeregister } from '../../../services/database';
import { Recipe, type RecipeKind } from '../../../../../models/recipe.ts';
import { Item } from '../../../../../models/item.ts';
import { ItemInstance } from '../../../../../models/utils/itemInstance.ts';
import type { EntryCategory } from '../../../../../models/entry.ts';
import { SKILL_IDENTIFIER_SUGGESTIONS } from '../../../../../models/utils/skill.ts';
import { getImageUrl, useImageUpload } from '../../../services/useImageUpload';
import FloatingSearch from '../../../components/FloatingSearch/FloatingSearch';
import NumberFieldCard from './NumberFieldCard';
import RecipeSlot from './RecipeSlot';
import { ALL_CATEGORIES, AUTOSAVE_DELAY } from '../CodexPage';

import styles from './entryWindows.module.css';


interface Props {
    recipe: Recipe;
    customization: boolean;
    isNew: boolean;
    onCategoryChange: (cat: EntryCategory) => void;
    onSaved: () => void;
    onDeleted: () => void;
    onDirtyChange?: (dirty: boolean) => void;
}

const REALTIME_ECHO_GRACE_MS = 800;
const RECIPE_KINDS: RecipeKind[] = ['CRAFTING', 'SMITHING', 'ALCHEMY', 'ENCHANTING', 'COOKING'];

const AddSlot: React.FC<{ onAdd: (key: string, quantity: number) => void; searchPlaceholder: string }> = ({ onAdd, searchPlaceholder }) => {

    const [phase, setPhase] = useState<'idle' | 'searching' | 'quantity'>('idle');
    const [pending, setPending] = useState<{ key: string; name: string } | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const openSearch = () => {
        const rect = wrapperRef.current?.getBoundingClientRect();
        setPos(rect ? { x: rect.left, y: rect.bottom + 6 } : { x: 0, y: 0 });
        setPhase('searching');
    };

    return (
        <div className={styles.recipeSlotWrapper} ref={wrapperRef}>
            <div className={styles.recipeAddCell} onClick={openSearch}>
                <span className={styles.recipeAddPlus}>+</span>
            </div>

            {phase === 'searching' && pos && (
                <div className={styles.recipeSearchAnchor} style={{ left: pos.x, top: pos.y }}>
                    <FloatingSearch
                        categories={['ITEM']}
                        onSelect={result => { setPending({ key: result.key, name: result.name }); setPhase('quantity'); }}
                        onClose={() => setPhase(prev => prev === 'searching' ? 'idle' : prev)}
                        placeholder={searchPlaceholder}
                    />
                </div>
            )}

            {phase === 'quantity' && pending && pos && (
                <div className={styles.recipeQuantityPanel} style={{ left: pos.x, top: pos.y }}>
                    <div className={styles.recipeQuantityName}>{pending.name}</div>
                    <div className={styles.recipeQuantityControls}>
                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                        <span>{quantity}</span>
                        <button onClick={() => setQuantity(q => q + 1)}>+</button>
                        <button
                            className={styles.recipeQuantityConfirm}
                            onClick={() => { onAdd(pending.key, quantity); setPhase('idle'); setPending(null); setQuantity(1); }}
                        >✓</button>
                    </div>
                </div>
            )}
        </div>
    );

};

const RecipeWindow: React.FC<Props> = ({ recipe: initialRecipe, customization, isNew, onCategoryChange, onSaved, onDeleted, onDirtyChange }) => {

    const { language } = useLanguage();
    const { uploading, triggerUpload, deleteImage } = useImageUpload();

    const [recipe, setRecipe] = useState<Recipe>(() => new Recipe(initialRecipe));
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [pendingDelete, setPendingDelete] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [kindOpen, setKindOpen] = useState(false);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [tempTag, setTempTag] = useState('');
    const [itemCache, setItemCache] = useState<Record<string, Item>>({});

    const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDirtyRef = useRef(false);
    const isFirstRender = useRef(true);
    const categoryRef = useRef<HTMLDivElement>(null);
    const kindRef = useRef<HTMLDivElement>(null);
    const recipeRef = useRef(recipe);
    recipeRef.current = recipe;
    const requestedKeysRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        if (isDirtyRef.current) return;
        setRecipe(new Recipe(initialRecipe));
        setSaveStatus('idle');
        setPendingDelete(false);
    }, [initialRecipe]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false);
            if (kindRef.current && !kindRef.current.contains(e.target as Node)) setKindOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const ingredientKeysSignature = recipe.ingredients.map(i => i.referenceKey).join('|');
    useEffect(() => {
        const missing = recipe.ingredients
            .map(i => i.referenceKey)
            .filter(k => !requestedKeysRef.current.has(k));
        if (missing.length === 0) return;
        missing.forEach(k => requestedKeysRef.current.add(k));
        (async () => {
            const fetched = await Promise.all(missing.map(k => dbFetch(`entries/${k}`)));
            setItemCache(prev => {
                const next = { ...prev };
                missing.forEach((k, i) => { if (fetched[i] instanceof Item) next[k] = fetched[i]; });
                return next;
            });
        })();
    }, [ingredientKeysSignature]);

    const scheduleAutosave = useCallback((updated: Recipe) => {
        if (!customization || isNew) return;
        if (autosaveRef.current) clearTimeout(autosaveRef.current);
        isDirtyRef.current = true;
        onDirtyChange?.(true);
        setSaveStatus('saving');
        autosaveRef.current = setTimeout(async () => {
            const ok = await dbRegister(`entries/${updated.key}`, updated);
            setTimeout(() => { isDirtyRef.current = false; onDirtyChange?.(false); }, REALTIME_ECHO_GRACE_MS);
            setSaveStatus(ok ? 'saved' : 'error');
        }, AUTOSAVE_DELAY);
    }, [customization, isNew, onDirtyChange]);

    const handleFirstSave = async () => {
        setSaveStatus('saving');
        const ok = await dbRegister(`entries/${recipe.key}`, recipe);
        if (ok) { setSaveStatus('saved'); onSaved(); }
        else setSaveStatus('error');
    };

    const update = () => {
        const updated = new Recipe(recipe);
        setRecipe(updated);
        scheduleAutosave(updated);
    };

    const handleDelete = async () => {
        if (!pendingDelete) { setPendingDelete(true); return; }
        const ok = await dbDeregister(`entries/${recipe.key}`);
        if (ok) onDeleted();
    };

    const addIngredient = (key: string, quantity: number) => {
        recipe.ingredients.push({ referenceKey: key, quantity });
        update();
    };
    const removeIngredient = (index: number) => { recipe.ingredients.splice(index, 1); update(); };
    const setIngredientQuantity = (index: number, value: number) => { recipe.ingredients[index].quantity = Math.max(1, value); update(); };

    const addProduct = async (key: string, quantity: number) => {
        const entry = await dbFetch(`entries/${key}`);
        if (!(entry instanceof Item)) return;
        const instance = new ItemInstance(entry);
        instance.currentStack = Math.max(1, quantity);
        recipeRef.current.products.push(instance);
        const updated = new Recipe(recipeRef.current);
        setRecipe(updated);
        scheduleAutosave(updated);
    };
    const removeProduct = (index: number) => { recipe.products.splice(index, 1); update(); };
    const setProductQuantity = (index: number, value: number) => { recipe.products[index].currentStack = Math.max(1, value); update(); };

    const NameContainer = () => (
        customization ? (
            <input
                className={styles.nameInput}
                value={recipe.name || ''}
                onChange={e => { recipe.name = e.target.value; update(); }}
                placeholder={t({ text: 'name', language, mode: 'UPPERCASE' })}
            />
        ) : (<div className={styles.nameDisplay}>{recipe.name || '—'}</div>)
    )

    const DescriptionContainer = () => (
        customization ?
        (
            <textarea
                className={styles.descriptionInput}
                value={recipe.description || ''}
                onChange={e => { recipe.description = e.target.value; update(); }}
                placeholder={t({ text: 'description', language, mode: 'PLAIN_FIRST_UPPER' })}
            />
        ) : (<div className={styles.descriptionDisplay}>{recipe.description || '—'}</div>)
    )

    const ImageContainer = () => <>
            <div
                className={`${styles.imageContainer}${customization ? ` ${styles.imageContainerClickable}` : ''}`}
                onClick={() => { if (!customization) return; triggerUpload(recipe.key, path => { recipe.image = path; update(); }); }}
            >
                <img className={styles.imageImg} src={getImageUrl(recipe.image, recipe.category)} alt={recipe.name || ''} />
                {customization && (
                    <div className={styles.imageOverlay}>
                        {uploading ? '...' : '↑'}
                    </div>
                )}
                {customization && recipe.image && (
                    <button
                        className={styles.imageDeleteBtn}
                        onClick={e => {
                            e.stopPropagation();
                            deleteImage(recipe.image!, () => { recipe.image = null; update(); });
                        }}
                        title="Remove image"
                    >×</button>
                )}
            </div>
    </>

    const KeyContainer = () => <>
        <div className={styles.keyLabel}>{recipe.key}</div>
    </>

    const CategoryContainer = () => <>
        <div className={styles.categoryDropdown} ref={categoryRef}>
            <button
                className={styles.categoryBtn}
                onClick={customization ? () => setCategoryOpen(o => !o) : undefined}
                disabled={!customization}
            >
                {t({ text: recipe.category, language, mode: 'TITLECASE' })}
                {customization && <span className={styles.dropdownCaret}>▾</span>}
            </button>
            {categoryOpen && (
                <div className={styles.dropdownMenu}>
                    {ALL_CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            className={`${styles.dropdownOption}${cat === recipe.category ? ` ${styles.dropdownOptionActive}` : ''}`}
                            onClick={() => { setCategoryOpen(false); onCategoryChange(cat); }}
                        >
                            {t({ text: cat, language, mode: 'TITLECASE' })}
                        </button>
                    ))}
                </div>
            )}
        </div>
    </>

    const TagsContainer = () => <>
        <div className={styles.tagsRow}>
            {recipe.tags.map((tag, i) => (
                <div key={i} className={styles.tag}>
                    <span>{tag}</span>
                    {customization && <button className={styles.tagRemove} onClick={() => { recipe.tags.splice(i, 1); update(); }}>×</button>}
                </div>
            ))}
            {customization && (
                isAddingTag ? (
                    <input
                        autoFocus
                        className={styles.tagInput}
                        value={tempTag}
                        onChange={e => setTempTag(e.target.value)}
                        onBlur={() => { if(tempTag.trim()) { recipe.tags.push(tempTag.trim()); update(); } setIsAddingTag(false); setTempTag(''); }}
                        onKeyDown={e => { if(e.key === 'Enter') e.currentTarget.blur(); if(e.key === 'Escape') { setTempTag(''); setIsAddingTag(false); } }}
                    />
                ) : (
                    <button className={styles.tagAdd} onClick={() => setIsAddingTag(true)}>+</button>
                )
            )}
        </div>
    </>

    const KindContainer = () => <>
        <div>
            <div className={styles.sectionLabel}>
                {t({ text: 'kind', language, mode: 'UPPERCASE' })}
            </div>
            <div className={styles.kindDropdown} ref={kindRef}>
                <button
                    className={styles.kindBtn}
                    onClick={customization ? () => setKindOpen(o => !o) : undefined}
                    disabled={!customization}
                >
                    {t({ text: recipe.kind, language, mode: 'TITLECASE' })}
                    {customization && <span className={styles.dropdownCaret}>▾</span>}
                </button>
                {kindOpen && (
                    <div className={styles.dropdownMenu}>
                        {RECIPE_KINDS.map(k => (
                            <button
                                key={k}
                                className={`${styles.dropdownOption}${k === recipe.kind ? ` ${styles.dropdownOptionActive}` : ''}`}
                                onClick={() => { setKindOpen(false); recipe.kind = k; update(); }}
                            >
                                {t({ text: k, language, mode: 'TITLECASE' })}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </>

    const IngredientsProductsContainer = () => <>
        <div className={styles.recipeFlow}>
            <div className={styles.recipeGroup}>
                <div className={styles.sectionLabel}>{t({ text: 'ingredients', language, mode: 'UPPERCASE' })}</div>
                <div className={styles.recipeSlotRow}>
                    {recipe.ingredients.map((ingredient, i) => (
                        <RecipeSlot
                            key={i}
                            image={itemCache[ingredient.referenceKey]?.image ?? null}
                            name={itemCache[ingredient.referenceKey]?.name ?? null}
                            quantity={ingredient.quantity}
                            editable={customization}
                            onRemove={() => removeIngredient(i)}
                            onQuantityChange={v => setIngredientQuantity(i, v)}
                        />
                    ))}
                    {customization && (
                        <AddSlot onAdd={addIngredient} searchPlaceholder={t({ text: 'search-material', language, mode: 'PLAIN_FIRST_UPPER' })} />
                    )}
                </div>
            </div>

            <div className={styles.recipeArrow}>→</div>

            <div className={styles.recipeGroup}>
                <div className={styles.sectionLabel}>{t({ text: 'products', language, mode: 'UPPERCASE' })}</div>
                <div className={styles.recipeSlotRow}>
                    {recipe.products.map((instance, i) => (
                        <RecipeSlot
                            key={i}
                            image={instance.reference.image}
                            name={instance.reference.name}
                            quantity={instance.currentStack}
                            editable={customization}
                            onRemove={() => removeProduct(i)}
                            onQuantityChange={v => setProductQuantity(i, v)}
                        />
                    ))}
                    {customization && (
                        <AddSlot onAdd={addProduct} searchPlaceholder={t({ text: 'search-material', language, mode: 'PLAIN_FIRST_UPPER' })} />
                    )}
                </div>
            </div>
        </div>
    </>

    const CompetenceContainer = () => {
        if (!customization && !recipe.competence) return null;
        return (
            <div className={styles.modifiersSection}>
                <div className={styles.sectionLabel}>{t({ text: 'competence', language, mode: 'UPPERCASE' })}</div>
                {recipe.competence ? (
                    <div className={styles.modifiersList}>
                        <div className={styles.modifierCard}>
                            {customization && (
                                <button className={styles.modifierRemove} onClick={() => { recipe.competence = null; update(); }}>×</button>
                            )}
                            {customization ? (
                                <select
                                    className={styles.identifierSelect}
                                    value={recipe.competence.skill}
                                    onChange={e => { recipe.competence!.skill = e.target.value; update(); }}
                                >
                                    {!(SKILL_IDENTIFIER_SUGGESTIONS as readonly string[]).includes(recipe.competence.skill) && (
                                        <option value={recipe.competence.skill}>{t({ text: recipe.competence.skill, language, mode: 'TITLECASE' })}</option>
                                    )}
                                    {SKILL_IDENTIFIER_SUGGESTIONS.map(suggestion => (
                                        <option key={suggestion} value={suggestion}>{t({ text: suggestion, language, mode: 'TITLECASE' })}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className={styles.modifierNameDisplay}>{t({ text: recipe.competence.skill, language, mode: 'TITLECASE' })}</div>
                            )}
                            <div className={styles.fieldsList}>
                                <NumberFieldCard
                                    label={t({ text: 'required-exp', language, mode: 'UPPERCASE' })}
                                    value={recipe.competence.requiredExp}
                                    customization={customization}
                                    onChange={v => { recipe.competence!.requiredExp = v; update(); }}
                                    min={0}
                                    step={10}
                                />
                                <NumberFieldCard
                                    label={t({ text: 'experience-contribution', language, mode: 'UPPERCASE' })}
                                    value={recipe.competence.experienceContribution}
                                    customization={customization}
                                    onChange={v => { recipe.competence!.experienceContribution = v; update(); }}
                                    min={0}
                                />
                            </div>
                        </div>
                    </div>
                ) : customization && (
                    <button
                        className={styles.addModifierBtn}
                        onClick={() => { recipe.competence = { skill: SKILL_IDENTIFIER_SUGGESTIONS[0], requiredExp: 0, experienceContribution: 0 }; update(); }}
                    >
                        + {t({ text: 'competence', language, mode: 'UPPERCASE' })}
                    </button>
                )}
            </div>
        );
    };

    const Footer = () => <>
        <div className={styles.footer}>
            <span className={`${styles.saveStatus} ${styles[saveStatus]}`}>
                {saveStatus === 'saving' && t({ text: 'saving', language, mode: 'UPPERCASE' })}
                {saveStatus === 'saved' && t({ text: 'saved', language, mode: 'UPPERCASE' })}
                {saveStatus === 'error' && t({ text: 'save-error', language, mode: 'UPPERCASE' })}
            </span>
            {isNew ? (
                <button className={styles.saveBtn} onClick={handleFirstSave}>
                    {t({ text: 'save', language, mode: 'UPPERCASE' })}
                </button>
            ) : (
                <>
                    <button
                        className={`${styles.deleteBtn}${pendingDelete ? ` ${styles.deleteBtnConfirm}` : ''}`}
                        onClick={handleDelete}
                    >
                        {pendingDelete ? t({ text: 'confirm-delete', language, mode: 'UPPERCASE' }) : t({ text: 'delete', language, mode: 'UPPERCASE' })}
                    </button>
                    {pendingDelete && (
                        <button className={styles.cancelBtn} onClick={() => setPendingDelete(false)}>
                            {t({ text: 'cancel', language, mode: 'UPPERCASE' })}
                        </button>
                    )}
                </>
            )}
        </div>
    </>

    return (
        <div className={styles.page}>
            <div className={styles.topRow}>
                <div className={styles.imageCol}>
                    {ImageContainer()}
                    {KeyContainer()}
                </div>
                <div className={styles.nameDescCol}>
                    <div className={styles.nameRow}>
                        {NameContainer()}
                        {CategoryContainer()}
                    </div>
                    {DescriptionContainer()}
                </div>
            </div>
            {TagsContainer()}
            {KindContainer()}
            {IngredientsProductsContainer()}
            {CompetenceContainer()}
            {customization ? Footer() : null}
        </div>
    );

};


export default RecipeWindow;
