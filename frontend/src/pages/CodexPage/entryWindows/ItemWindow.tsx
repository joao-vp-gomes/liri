// frontend/src/pages/CodexPage/entryWindows/ItemWindow.tsx


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';
import { dbRegister, dbDeregister } from '../../../services/database';
import { Item, Equipable, Breakable, Weapon, Tool, Apparel, Container, Consumable, Material, type ItemKind } from '../../../../../models/item.ts';
import { ItemFactory } from '../../../../../models/itemFactory.ts';
import type { EntryCategory } from '../../../../../models/entry.ts';
import type { Aspect } from '../../../../../models/utils/aspect.ts';
import { getImageUrl, useImageUpload } from '../../../services/useImageUpload';
import FloatingSearch from '../../../components/FloatingSearch/FloatingSearch';
import NumberFieldCard from './NumberFieldCard';
import { ALL_CATEGORIES, AUTOSAVE_DELAY } from '../CodexPage';

import styles from './entryWindows.module.css';


interface Props {
    item: Item;
    customization: boolean;
    isNew: boolean;
    onCategoryChange: (cat: EntryCategory) => void;
    onSaved: () => void;
    onDeleted: () => void;
    onDirtyChange?: (dirty: boolean) => void;
}

const ITEM_KINDS: ItemKind[] = ['WEAPON', 'TOOL', 'APPAREL', 'ACCESSORY', 'CONTAINER', 'CONSUMABLE', 'MATERIAL', 'ARTIFACT'];
const REALTIME_ECHO_GRACE_MS = 800;
const ASPECT_FIELDS: (keyof Aspect)[] = ['slash', 'pierce', 'bludgeon', 'arcane', 'pure'];

const instantiateItem = (kind: ItemKind, source: Partial<Item>): Item => ItemFactory.instantiateAs(kind, source);

const ItemWindow: React.FC<Props> = ({ item: initialItem, customization, isNew, onCategoryChange, onSaved, onDeleted, onDirtyChange }) => {

    const { language } = useLanguage();
    const { uploading, triggerUpload, deleteImage } = useImageUpload();

    const [item, setItem] = useState<Item>(() => instantiateItem(initialItem.kind, initialItem));
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [pendingDelete, setPendingDelete] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [kindOpen, setKindOpen] = useState(false);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [tempTag, setTempTag] = useState('');
    const [compositionSearchOpen, setCompositionSearchOpen] = useState(false);
    const [compositionNames, setCompositionNames] = useState<Record<string, string>>({});

    const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDirtyRef = useRef(false);
    const isFirstRender = useRef(true);
    const categoryRef = useRef<HTMLDivElement>(null);
    const kindRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        if (isDirtyRef.current) return;
        setItem(instantiateItem(initialItem.kind, initialItem));
        setSaveStatus('idle');
        setPendingDelete(false);
    }, [initialItem]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false);
            if (kindRef.current && !kindRef.current.contains(e.target as Node)) setKindOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const scheduleAutosave = useCallback((updated: Item) => {
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
        const ok = await dbRegister(`entries/${item.key}`, item);
        if (ok) { setSaveStatus('saved'); onSaved(); }
        else setSaveStatus('error');
    };

    const update = () => {
        const updated = instantiateItem(item.kind, item);
        setItem(updated);
        scheduleAutosave(updated);
    };

    const handleKindChange = (newKind: ItemKind) => {
        setKindOpen(false);
        const updated = instantiateItem(newKind, item);
        setItem(updated);
        scheduleAutosave(updated);
    };

    const handleDelete = async () => {
        if (!pendingDelete) { setPendingDelete(true); return; }
        const ok = await dbDeregister(`entries/${item.key}`);
        if (ok) onDeleted();
    };

    const NameContainer = () => (
        customization ? (
            <input
                className={styles.nameInput}
                value={item.name || ''}
                onChange={e => { item.name = e.target.value; update(); }}
                placeholder={t({ text: 'name', language, mode: 'UPPERCASE' })}
            />
        ) : (<div className={styles.nameDisplay}>{item.name || '—'}</div>)
    )

    const DescriptionContainer = () => (
        customization ?
        (
            <textarea
                className={styles.descriptionInput}
                value={item.description || ''}
                onChange={e => { item.description = e.target.value; update(); }}
                placeholder={t({ text: 'description', language, mode: 'PLAIN_FIRST_UPPER' })}
            />
        ) : (<div className={styles.descriptionDisplay}>{item.description || '—'}</div>)
    )

    const ImageContainer = () => <>
            <div
                className={`${styles.imageContainer}${customization ? ` ${styles.imageContainerClickable}` : ''}`}
                onClick={() => { if (!customization) return; triggerUpload(item.key, path => { item.image = path; update(); }); }}
            >
                <img className={styles.imageImg} src={getImageUrl(item.image, item.category)} alt={item.name || ''} />
                {customization && (
                    <div className={styles.imageOverlay}>
                        {uploading ? '...' : '↑'}
                    </div>
                )}
                {customization && item.image && (
                    <button
                        className={styles.imageDeleteBtn}
                        onClick={e => {
                            e.stopPropagation();
                            deleteImage(item.image!, () => { item.image = null; update(); });
                        }}
                        title="Remove image"
                    >×</button>
                )}
            </div>
    </>

    const KeyContainer = () => <>
        <div className={styles.keyLabel}>{item.key}</div>
    </>

    const CategoryContainer = () => <>
        <div className={styles.categoryDropdown} ref={categoryRef}>
            <button
                className={styles.categoryBtn}
                onClick={customization ? () => setCategoryOpen(o => !o) : undefined}
                disabled={!customization}
            >
                {t({ text: item.category, language, mode: 'TITLECASE' })}
                {customization && <span className={styles.dropdownCaret}>▾</span>}
            </button>
            {categoryOpen && (
                <div className={styles.dropdownMenu}>
                    {ALL_CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            className={`${styles.dropdownOption}${cat === item.category ? ` ${styles.dropdownOptionActive}` : ''}`}
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
            {item.tags.map((tag, i) => (
                <div key={i} className={styles.tag}>
                    <span>{tag}</span>
                    {customization && <button className={styles.tagRemove} onClick={() => { item.tags.splice(i, 1); update(); }}>×</button>}
                </div>
            ))}
            {customization && (
                isAddingTag ? (
                    <input
                        autoFocus
                        className={styles.tagInput}
                        value={tempTag}
                        onChange={e => setTempTag(e.target.value)}
                        onBlur={() => { if(tempTag.trim()) { item.tags.push(tempTag.trim()); update(); } setIsAddingTag(false); setTempTag(''); }}
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
                    {t({ text: item.kind, language, mode: 'TITLECASE' })}
                    {customization && <span className={styles.dropdownCaret}>▾</span>}
                </button>
                {kindOpen && (
                    <div className={styles.dropdownMenu}>
                        {ITEM_KINDS.map(k => (
                            <button
                                key={k}
                                className={`${styles.dropdownOption}${k === item.kind ? ` ${styles.dropdownOptionActive}` : ''}`}
                                onClick={() => handleKindChange(k)}
                            >
                                {t({ text: k, language, mode: 'TITLECASE' })}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </>

    const renderAspectFields = (aspect: Partial<Aspect>, onFieldChange: (field: keyof Aspect, value: number) => void) => (
        <div className={styles.fieldsList}>
            {ASPECT_FIELDS.map(field => {
                const value = aspect[field] ?? 0;
                if (!customization && value === 0) return null;
                return (
                    <NumberFieldCard
                        key={field}
                        label={t({ text: field.toUpperCase(), language, mode: 'UPPERCASE' })}
                        value={value}
                        customization={customization}
                        onChange={v => onFieldChange(field, v)}
                    />
                );
            })}
        </div>
    );

    const renderSingleField = (labelKey: string, value: number, onChange: (value: number) => void, min = 0, infiniteAt?: number) => (
        <div>
            <div className={styles.sectionLabel}>{t({ text: labelKey, language, mode: 'UPPERCASE' })}</div>
            <div className={styles.fieldsList}>
                <NumberFieldCard
                    label={t({ text: labelKey, language, mode: 'UPPERCASE' })}
                    value={value}
                    customization={customization}
                    onChange={onChange}
                    min={min}
                    infiniteAt={infiniteAt}
                />
            </div>
        </div>
    );

    const StackContainer = () => renderSingleField('stack', item.stack, v => { item.stack = v; update(); }, 1);

    const WeaponFieldsContainer = (weapon: Weapon) => <>
        <div>
            <div className={styles.sectionLabel}>{t({ text: 'damage', language, mode: 'UPPERCASE' })}</div>
            {renderAspectFields(weapon.damage, (field, value) => { weapon.damage[field] = value; update(); })}
        </div>
        {renderSingleField('defense', weapon.defense, v => { weapon.defense = v; update(); })}
    </>

    const ToolFieldsContainer = (tool: Tool) => <>
        {renderSingleField('efficiency', tool.efficiency, v => { tool.efficiency = v; update(); })}
    </>

    const ApparelFieldsContainer = (apparel: Apparel) => <>
        <div>
            <div className={styles.sectionLabel}>{t({ text: 'resistance', language, mode: 'UPPERCASE' })}</div>
            {renderAspectFields(apparel.resistance, (field, value) => { apparel.resistance[field] = value; update(); })}
        </div>
        <div>
            <div className={styles.sectionLabel}>{t({ text: 'protection', language, mode: 'UPPERCASE' })}</div>
            {renderAspectFields(apparel.protection, (field, value) => { apparel.protection[field] = value; update(); })}
        </div>
        {renderSingleField('weight', apparel.weight, v => { apparel.weight = v; update(); })}
    </>

    const ContainerFieldsContainer = (container: Container) => <>
        {renderSingleField('size', container.size, v => { container.size = v; update(); }, 1)}
    </>

    const ConsumableFieldsContainer = (consumable: Consumable) => <>
        {renderSingleField('efficiency', consumable.efficiency, v => { consumable.efficiency = v; update(); })}
    </>

    const DurabilityContainer = (breakable: Breakable) => renderSingleField(
        'durability',
        breakable.durability ?? -1,
        v => { breakable.durability = v; update(); },
        -1,
        -1
    );

    const CompositionsContainer = (breakable: Breakable) => {
        if (!customization && breakable.compositions.length === 0) return null;
        return (
            <div className={styles.compositionsSection}>
                <div className={styles.sectionLabel}>{t({ text: 'compositions', language, mode: 'UPPERCASE' })}</div>
                <div className={styles.compositionList}>
                    {breakable.compositions.map((comp, i) => (
                        <div key={i} className={styles.compositionCard}>
                            <span className={styles.compositionRef}>{compositionNames[comp.referenceKey] ?? comp.referenceKey}</span>
                            {customization ? (
                                <div className={styles.fieldValueControls}>
                                    <button onClick={() => { breakable.compositions[i].repairFactor = Math.max(0, breakable.compositions[i].repairFactor - 1); update(); }}>−</button>
                                    <span>{comp.repairFactor}</span>
                                    <button onClick={() => { breakable.compositions[i].repairFactor++; update(); }}>+</button>
                                </div>
                            ) : (
                                <span className={styles.compositionValue}>{comp.repairFactor}</span>
                            )}
                            {customization && <button className={styles.compositionRemove} onClick={() => { breakable.compositions.splice(i, 1); update(); }}>×</button>}
                        </div>
                    ))}
                </div>
                {customization && (
                    <div className={styles.compositionAddWrapper}>
                        <button className={styles.compositionAddBtn} onClick={() => setCompositionSearchOpen(true)}>+</button>
                        {compositionSearchOpen && (
                            <FloatingSearch
                                categories={['ITEM']}
                                onSelect={result => {
                                    breakable.compositions.push({ referenceKey: result.key, repairFactor: 1 });
                                    setCompositionNames(prev => ({ ...prev, [result.key]: result.name }));
                                    update();
                                }}
                                onClose={() => setCompositionSearchOpen(false)}
                                placeholder={t({ text: 'search-material', language, mode: 'PLAIN_FIRST_UPPER' })}
                            />
                        )}
                    </div>
                )}
            </div>
        );
    };

    const TraitsContainer = (equipable: Equipable) => {
        if (!customization && equipable.traits.length === 0) return null;
        return (
            <div className={styles.modifiersSection}>
                <div className={styles.sectionLabel}>{t({ text: 'traits', language, mode: 'UPPERCASE' })}</div>
                <div className={styles.modifiersList}>
                    {equipable.traits.map((trait, traitIndex) => (
                        <div key={traitIndex} className={styles.modifierCard}>
                            {customization ? (
                                <input className={styles.modifierNameInput} value={trait.name}
                                    onChange={e => { equipable.traits[traitIndex].name = e.target.value; update(); }}
                                    placeholder={t({ text: 'name', language, mode: 'UPPERCASE' })} />
                            ) : <div className={styles.modifierNameDisplay}>{trait.name || '—'}</div>}

                            {customization ? (
                                <textarea className={styles.modifierDescInput} value={trait.description || ''}
                                    onChange={e => { equipable.traits[traitIndex].description = e.target.value; update(); }}
                                    placeholder={t({ text: 'description', language, mode: 'PLAIN_FIRST_UPPER' })} />
                            ) : <div className={styles.modifierDescDisplay}>{trait.description || '—'}</div>}

                            {customization && (
                                <div className={styles.effectsList}>
                                    {trait.effects.map((effect, effectIndex) => (
                                        <div key={effectIndex} className={styles.effectRow}>

                                            <input className={styles.effectIdentifierInput} value={effect.identifier}
                                                onChange={e => { equipable.traits[traitIndex].effects[effectIndex].identifier = e.target.value; update(); }}
                                                placeholder={t({ text: 'identifier', language: language, mode: 'LOWERCASE'})} />

                                            <select className={styles.effectKindSelect} value={effect.mode}
                                                onChange={e => { equipable.traits[traitIndex].effects[effectIndex].mode = e.target.value as typeof effect.mode; update(); }}>
                                                <option value="ADDER">{t({ text: 'ADDER', language: language, mode: 'UPPERCASE'})}</option>
                                                <option value="MULTIPLIER">{t({ text: 'MULTIPLIER', language: language, mode: 'UPPERCASE'})}</option>
                                                <option value="SETTER">{t({ text: 'SETTER', language: language, mode: 'UPPERCASE'})}</option>
                                            </select>

                                            <div className={styles.effectValueControls}>
                                                <button onClick={() => { equipable.traits[traitIndex].effects[effectIndex].value--; update(); }}>−</button>
                                                <span>{effect.value}</span>
                                                <button onClick={() => { equipable.traits[traitIndex].effects[effectIndex].value++; update(); }}>+</button>
                                            </div>

                                            <button className={styles.effectRemove} onClick={() => { equipable.traits[traitIndex].effects.splice(effectIndex, 1); update(); }}>×</button>

                                        </div>
                                    ))}
                                    <button className={styles.addEffectBtn} onClick={() => { equipable.traits[traitIndex].effects.push({ identifier: '', mode: 'ADDER', value: 0 }); update(); }}>
                                        + {t({ text: 'effect', language, mode: 'UPPERCASE' })}
                                    </button>
                                </div>
                            )}
                            {customization && <button className={styles.modifierRemove} onClick={() => { equipable.traits.splice(traitIndex, 1); update(); }}>×</button>}
                        </div>
                    ))}
                    {customization && (
                        <button className={styles.addModifierBtn} onClick={() => { equipable.traits.push({ name: '', description: '', effects: [] }); update(); }}>
                            + {t({ text: 'trait', language, mode: 'UPPERCASE' })}
                        </button>
                    )}
                </div>
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
            {(item instanceof Consumable || item instanceof Material) && StackContainer()}
            {item instanceof Weapon && WeaponFieldsContainer(item)}
            {item instanceof Tool && ToolFieldsContainer(item)}
            {item instanceof Apparel && ApparelFieldsContainer(item)}
            {item instanceof Container && ContainerFieldsContainer(item)}
            {item instanceof Consumable && ConsumableFieldsContainer(item)}
            {item instanceof Breakable && DurabilityContainer(item)}
            {item instanceof Breakable && CompositionsContainer(item)}
            {item instanceof Equipable && TraitsContainer(item)}
            {customization ? Footer() : null}
        </div>
    );

};


export default ItemWindow;
