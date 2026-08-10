// frontend/src/pages/CodexPage/entryWindows/CatalogueWindow.tsx


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';
import { dbFetch, dbRegister, dbDeregister } from '../../../services/database';
import { Catalogue, type RecipeKind, type Recipe } from '../../../../../models/catalogue.ts';
import { Item } from '../../../../../models/item.ts';
import { ItemInstance } from '../../../../../models/utils/itemInstance.ts';
import type { EntryCategory } from '../../../../../models/entry.ts';
import type { Modifier } from '../../../../../models/utils/modifier.ts';
import { SKILL_IDENTIFIER_SUGGESTIONS } from '../../../../../models/utils/skill.ts';
import { getImageUrl, useImageUpload } from '../../../services/useImageUpload';
import FloatingSearch from '../../../components/FloatingSearch/FloatingSearch';
import NumberFieldCard from './NumberFieldCard';
import RecipeSlot from './RecipeSlot';
import { useClampedPosition, type Anchor } from '../../../utils/useClampedPosition';
import { ALL_CATEGORIES, AUTOSAVE_DELAY } from '../CodexPage';

import styles from './entryWindows.module.css';


interface Props {
    catalogue: Catalogue;
    customization: boolean;
    isNew: boolean;
    onCategoryChange: (cat: EntryCategory) => void;
    onSaved: () => void;
    onDeleted: () => void;
    onDirtyChange?: (dirty: boolean) => void;
}

const REALTIME_ECHO_GRACE_MS = 800;
const RECIPE_KINDS: RecipeKind[] = ['CRAFTING', 'SMITHING', 'ALCHEMY', 'ENCHANTING', 'COOKING', 'PURCHASE'];

const AddSlot: React.FC<{ onAdd: (key: string, quantity: number) => void; searchPlaceholder: string }> = ({ onAdd, searchPlaceholder }) => {

    const [phase, setPhase] = useState<'idle' | 'searching' | 'quantity'>('idle');
    const [pending, setPending] = useState<{ key: string; name: string } | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [pos, setPos] = useState<Anchor | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { ref: searchRef, style: searchStyle } = useClampedPosition(phase === 'searching' ? pos : null);
    const { ref: quantityRef, style: quantityStyle } = useClampedPosition(phase === 'quantity' ? pos : null);

    const openSearch = () => {
        const rect = wrapperRef.current?.getBoundingClientRect();
        setPos(rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } : { top: 0, bottom: 0, left: 0, right: 0 });
        setPhase('searching');
    };

    return (
        <div className={styles.recipeSlotWrapper} ref={wrapperRef}>
            <div className={styles.recipeAddCell} onClick={openSearch}>
                <span className={styles.recipeAddPlus}>+</span>
            </div>

            {phase === 'searching' && pos && (
                <div className={styles.recipeSearchAnchor} style={searchStyle} ref={searchRef}>
                    <FloatingSearch
                        categories={['ITEM']}
                        onSelect={result => { setPending({ key: result.key, name: result.name }); setPhase('quantity'); }}
                        onClose={() => setPhase(prev => prev === 'searching' ? 'idle' : prev)}
                        placeholder={searchPlaceholder}
                    />
                </div>
            )}

            {phase === 'quantity' && pending && pos && (
                <div className={styles.recipeQuantityPanel} style={quantityStyle} ref={quantityRef}>
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

const CatalogueWindow: React.FC<Props> = ({ catalogue: initialCatalogue, customization, isNew, onCategoryChange, onSaved, onDeleted, onDirtyChange }) => {

    const { language } = useLanguage();
    const { uploading, triggerUpload, deleteImage } = useImageUpload();

    const [catalogue, setCatalogue] = useState<Catalogue>(() => new Catalogue(initialCatalogue));
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
    const catalogueRef = useRef(catalogue);
    catalogueRef.current = catalogue;
    const requestedKeysRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        if (isDirtyRef.current) return;
        setCatalogue(new Catalogue(initialCatalogue));
        setSaveStatus('idle');
        setPendingDelete(false);
    }, [initialCatalogue]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false);
            if (kindRef.current && !kindRef.current.contains(e.target as Node)) setKindOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const ingredientKeysSignature = catalogue.recipes.flatMap(r => r.ingredients.map(i => i.referenceKey)).join('|');
    useEffect(() => {
        const missing = catalogue.recipes
            .flatMap(r => r.ingredients.map(i => i.referenceKey))
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

    const scheduleAutosave = useCallback((updated: Catalogue) => {
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
        const ok = await dbRegister(`entries/${catalogue.key}`, catalogue);
        if (ok) { setSaveStatus('saved'); onSaved(); }
        else setSaveStatus('error');
    };

    const update = () => {
        const updated = new Catalogue(catalogue);
        setCatalogue(updated);
        scheduleAutosave(updated);
    };

    const handleDelete = async () => {
        if (!pendingDelete) { setPendingDelete(true); return; }
        const ok = await dbDeregister(`entries/${catalogue.key}`);
        if (ok) onDeleted();
    };

    const addRecipe = () => {
        catalogue.recipes.push({ ingredients: [], products: [], competence: null });
        update();
    };
    const removeRecipe = (recipeIndex: number) => {
        catalogue.recipes.splice(recipeIndex, 1);
        update();
    };

    const addIngredient = (recipeIndex: number, key: string, quantity: number) => {
        catalogue.recipes[recipeIndex].ingredients.push({ referenceKey: key, quantity });
        update();
    };
    const removeIngredient = (recipeIndex: number, index: number) => {
        catalogue.recipes[recipeIndex].ingredients.splice(index, 1);
        update();
    };
    const setIngredientQuantity = (recipeIndex: number, index: number, value: number) => {
        catalogue.recipes[recipeIndex].ingredients[index].quantity = Math.max(1, value);
        update();
    };

    const addProduct = async (recipeIndex: number, key: string, quantity: number) => {
        const entry = await dbFetch(`entries/${key}`);
        if (!(entry instanceof Item)) return;
        const instance = new ItemInstance(entry);
        instance.currentStack = Math.max(1, quantity);
        catalogueRef.current.recipes[recipeIndex].products.push(instance);
        const updated = new Catalogue(catalogueRef.current);
        setCatalogue(updated);
        scheduleAutosave(updated);
    };
    const removeProduct = (recipeIndex: number, index: number) => {
        catalogue.recipes[recipeIndex].products.splice(index, 1);
        update();
    };
    const setProductQuantity = (recipeIndex: number, index: number, value: number) => {
        catalogue.recipes[recipeIndex].products[index].currentStack = Math.max(1, value);
        update();
    };
    const setProductQuirks = (recipeIndex: number, index: number, quirks: Modifier[]) => {
        catalogue.recipes[recipeIndex].products[index].quirks = quirks;
        update();
    };

    const addCompetence = (recipeIndex: number) => {
        catalogue.recipes[recipeIndex].competence = { skill: SKILL_IDENTIFIER_SUGGESTIONS[0], requiredExp: 0, experienceContribution: 0 };
        update();
    };
    const clearCompetence = (recipeIndex: number) => {
        catalogue.recipes[recipeIndex].competence = null;
        update();
    };
    const setCompetenceSkill = (recipeIndex: number, skill: string) => {
        const competence = catalogue.recipes[recipeIndex].competence;
        if (!competence) return;
        competence.skill = skill;
        update();
    };
    const setCompetenceRequiredExp = (recipeIndex: number, value: number) => {
        const competence = catalogue.recipes[recipeIndex].competence;
        if (!competence) return;
        competence.requiredExp = value;
        update();
    };
    const setCompetenceExperienceContribution = (recipeIndex: number, value: number) => {
        const competence = catalogue.recipes[recipeIndex].competence;
        if (!competence) return;
        competence.experienceContribution = value;
        update();
    };

    const NameContainer = () => (
        customization ? (
            <input
                className={styles.nameInput}
                value={catalogue.name || ''}
                onChange={e => { catalogue.name = e.target.value; update(); }}
                placeholder={t({ text: 'name', language, mode: 'UPPERCASE' })}
            />
        ) : (<div className={styles.nameDisplay}>{catalogue.name || '—'}</div>)
    )

    const DescriptionContainer = () => (
        customization ?
        (
            <textarea
                className={styles.descriptionInput}
                value={catalogue.description || ''}
                onChange={e => { catalogue.description = e.target.value; update(); }}
                placeholder={t({ text: 'description', language, mode: 'PLAIN_FIRST_UPPER' })}
            />
        ) : (<div className={styles.descriptionDisplay}>{catalogue.description || '—'}</div>)
    )

    const ImageContainer = () => <>
            <div
                className={`${styles.imageContainer}${customization ? ` ${styles.imageContainerClickable}` : ''}`}
                onClick={() => { if (!customization) return; triggerUpload(catalogue.key, path => { catalogue.image = path; update(); }); }}
            >
                <img className={styles.imageImg} src={getImageUrl(catalogue.image, catalogue.category)} alt={catalogue.name || ''} />
                {customization && (
                    <div className={styles.imageOverlay}>
                        {uploading ? '...' : '↑'}
                    </div>
                )}
                {customization && catalogue.image && (
                    <button
                        className={styles.imageDeleteBtn}
                        onClick={e => {
                            e.stopPropagation();
                            deleteImage(catalogue.image!, () => { catalogue.image = null; update(); });
                        }}
                        title="Remove image"
                    >×</button>
                )}
            </div>
    </>

    const KeyContainer = () => <>
        <div className={styles.keyLabel}>{catalogue.key}</div>
    </>

    const CategoryContainer = () => <>
        <div className={styles.categoryDropdown} ref={categoryRef}>
            <button
                className={styles.categoryBtn}
                onClick={customization ? () => setCategoryOpen(o => !o) : undefined}
                disabled={!customization}
            >
                {t({ text: catalogue.category, language, mode: 'TITLECASE' })}
                {customization && <span className={styles.dropdownCaret}>▾</span>}
            </button>
            {categoryOpen && (
                <div className={styles.dropdownMenu}>
                    {ALL_CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            className={`${styles.dropdownOption}${cat === catalogue.category ? ` ${styles.dropdownOptionActive}` : ''}`}
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
            {catalogue.tags.map((tag, i) => (
                <div key={i} className={styles.tag}>
                    <span>{tag}</span>
                    {customization && <button className={styles.tagRemove} onClick={() => { catalogue.tags.splice(i, 1); update(); }}>×</button>}
                </div>
            ))}
            {customization && (
                isAddingTag ? (
                    <input
                        autoFocus
                        className={styles.tagInput}
                        value={tempTag}
                        onChange={e => setTempTag(e.target.value)}
                        onBlur={() => { if(tempTag.trim()) { catalogue.tags.push(tempTag.trim()); update(); } setIsAddingTag(false); setTempTag(''); }}
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
                    {t({ text: catalogue.kind, language, mode: 'TITLECASE' })}
                    {customization && <span className={styles.dropdownCaret}>▾</span>}
                </button>
                {kindOpen && (
                    <div className={styles.dropdownMenu}>
                        {RECIPE_KINDS.map(k => (
                            <button
                                key={k}
                                className={`${styles.dropdownOption}${k === catalogue.kind ? ` ${styles.dropdownOptionActive}` : ''}`}
                                onClick={() => { setKindOpen(false); catalogue.kind = k; update(); }}
                            >
                                {t({ text: k, language, mode: 'TITLECASE' })}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </>

    const RecipeBlock = (recipe: Recipe, recipeIndex: number) => (
        <div className={styles.catalogueRecipeBlock} key={recipeIndex}>
            {customization && (
                <button className={styles.modifierRemove} onClick={() => removeRecipe(recipeIndex)}>×</button>
            )}
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
                                onRemove={() => removeIngredient(recipeIndex, i)}
                                onQuantityChange={v => setIngredientQuantity(recipeIndex, i, v)}
                            />
                        ))}
                        {customization && (
                            <AddSlot onAdd={(key, quantity) => addIngredient(recipeIndex, key, quantity)} searchPlaceholder={t({ text: 'search-material', language, mode: 'PLAIN_FIRST_UPPER' })} />
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
                                onRemove={() => removeProduct(recipeIndex, i)}
                                onQuantityChange={v => setProductQuantity(recipeIndex, i, v)}
                                quirks={instance.quirks}
                                onQuirksChange={q => setProductQuirks(recipeIndex, i, q)}
                            />
                        ))}
                        {customization && (
                            <AddSlot onAdd={(key, quantity) => addProduct(recipeIndex, key, quantity)} searchPlaceholder={t({ text: 'search-material', language, mode: 'PLAIN_FIRST_UPPER' })} />
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.catalogueCompetenceRow}>
                {recipe.competence ? (
                    <>
                        {customization ? (
                            <select
                                className={styles.identifierSelect}
                                value={recipe.competence.skill}
                                onChange={e => setCompetenceSkill(recipeIndex, e.target.value)}
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
                        <NumberFieldCard
                            label={t({ text: 'required-exp', language, mode: 'UPPERCASE' })}
                            value={recipe.competence.requiredExp}
                            customization={customization}
                            onChange={v => setCompetenceRequiredExp(recipeIndex, v)}
                            min={0}
                            step={10}
                        />
                        <NumberFieldCard
                            label={t({ text: 'experience-contribution', language, mode: 'UPPERCASE' })}
                            value={recipe.competence.experienceContribution}
                            customization={customization}
                            onChange={v => setCompetenceExperienceContribution(recipeIndex, v)}
                            min={0}
                        />
                        {customization && (
                            <button className={styles.effectRemove} onClick={() => clearCompetence(recipeIndex)}>×</button>
                        )}
                    </>
                ) : customization && (
                    <button className={styles.addModifierBtn} onClick={() => addCompetence(recipeIndex)}>
                        + {t({ text: 'competence', language, mode: 'UPPERCASE' })}
                    </button>
                )}
            </div>
        </div>
    );

    const RecipesContainer = () => {
        if (!customization && catalogue.recipes.length === 0) return null;
        return (
            <div>
                <div className={styles.sectionLabel}>{t({ text: 'recipes', language, mode: 'UPPERCASE' })}</div>
                {catalogue.recipes.map((recipe, recipeIndex) => RecipeBlock(recipe, recipeIndex))}
                {customization && (
                    <button className={styles.addModifierBtn} onClick={addRecipe}>
                        + {t({ text: 'recipe', language, mode: 'UPPERCASE' })}
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
            {RecipesContainer()}
            {customization ? Footer() : null}
        </div>
    );

};


export default CatalogueWindow;
