// frontend/src/pages/CodexPage/entryWindows/PawnWindow.tsx


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';
import { dbFetch, dbRegister, dbDeregister } from '../../../services/database';
import { Pawn, type PawnKind, type Action, type Drop, type DropBatch } from '../../../../../models/pawn.ts';
import { Item } from '../../../../../models/item.ts';
import { ItemInstance } from '../../../../../models/utils/itemInstance.ts';
import type { EntryCategory } from '../../../../../models/entry.ts';
import type { AttributesConstellation } from '../../../../../models/utils/attributesConstellation.ts';
import type { Aspect } from '../../../../../models/utils/aspect.ts';
import { getImageUrl, useImageUpload } from '../../../services/useImageUpload';
import FloatingSearch from '../../../components/FloatingSearch/FloatingSearch';
import NumberFieldCard from './NumberFieldCard';
import { useClampedPosition, type Anchor } from '../../../utils/useClampedPosition';
import { ALL_CATEGORIES, AUTOSAVE_DELAY } from '../CodexPage';

import styles from './entryWindows.module.css';


interface Props {
    pawn: Pawn;
    customization: boolean;
    isNew: boolean;
    onCategoryChange: (cat: EntryCategory) => void;
    onSaved: () => void;
    onDeleted: () => void;
    onDirtyChange?: (dirty: boolean) => void;
}

const REALTIME_ECHO_GRACE_MS = 800;
const PAWN_KINDS: PawnKind[] = ['UNIQUE', 'MULTIPLE'];
const TABS = ['stats', 'actions', 'constellation', 'drops'] as const;
type Tab = typeof TABS[number];

interface AttributeSpec {
    field: keyof AttributesConstellation;
    labelKey: string;
}
const PATH_GROUPS: { path: AttributeSpec; attributes: AttributeSpec[] }[] = [
    { path: { field: 'warriorPath', labelKey: 'WARRIOR_PATH' }, attributes: [
        { field: 'prowess', labelKey: 'PROWESS' },
        { field: 'strength', labelKey: 'STRENGTH' },
        { field: 'lethality', labelKey: 'LETHALITY' },
        { field: 'constitution', labelKey: 'CONSTITUTION' },
        { field: 'temper', labelKey: 'TEMPER' },
        { field: 'instinct', labelKey: 'INSTINCT' },
    ] },
    { path: { field: 'roguePath', labelKey: 'ROGUE_PATH' }, attributes: [
        { field: 'stealth', labelKey: 'STEALTH' },
        { field: 'precision', labelKey: 'PRECISION' },
        { field: 'dexterity', labelKey: 'DEXTERITY' },
        { field: 'breath', labelKey: 'BREATH' },
        { field: 'metabolism', labelKey: 'METABOLISM' },
        { field: 'shivers', labelKey: 'SHIVERS' },
    ] },
    { path: { field: 'sagePath', labelKey: 'SAGE_PATH' }, attributes: [
        { field: 'brewing', labelKey: 'BREWING' },
        { field: 'engineering', labelKey: 'ENGINEERING' },
        { field: 'erudition', labelKey: 'ERUDITION' },
        { field: 'intellect', labelKey: 'INTELLECT' },
        { field: 'composure', labelKey: 'COMPOSURE' },
        { field: 'insight', labelKey: 'INSIGHT' },
    ] },
    { path: { field: 'poetPath', labelKey: 'POET_PATH' }, attributes: [
        { field: 'drama', labelKey: 'DRAMA' },
        { field: 'rhetoric', labelKey: 'RHETORIC' },
        { field: 'threat', labelKey: 'THREAT' },
        { field: 'charisma', labelKey: 'CHARISMA' },
        { field: 'attunement', labelKey: 'ATTUNEMENT' },
        { field: 'empathy', labelKey: 'EMPATHY' },
    ] },
];

const ASPECT_KINDS: { field: 'resistances' | 'protections'; labelKey: string }[] = [
    { field: 'resistances', labelKey: 'resistance' },
    { field: 'protections', labelKey: 'protection' },
];
const ASPECT_FIELD_GROUPS: (keyof Aspect)[][] = [
    ['slash', 'pierce', 'bludgeon'],
    ['wither', 'delirium', 'taint', 'poison'],
    ['arcane', 'pure'],
];

const AddDropSlot: React.FC<{ onAdd: (key: string) => void; searchPlaceholder: string }> = ({ onAdd, searchPlaceholder }) => {

    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<Anchor | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { ref: searchRef, style: searchStyle } = useClampedPosition(open ? pos : null);

    const openSearch = () => {
        const rect = wrapperRef.current?.getBoundingClientRect();
        setPos(rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } : { top: 0, bottom: 0, left: 0, right: 0 });
        setOpen(true);
    };

    return (
        <div className={styles.recipeSlotWrapper} ref={wrapperRef}>
            <div className={styles.recipeAddCell} onClick={openSearch}>
                <span className={styles.recipeAddPlus}>+</span>
            </div>

            {open && pos && (
                <div className={styles.recipeSearchAnchor} style={searchStyle} ref={searchRef}>
                    <FloatingSearch
                        categories={['ITEM']}
                        onSelect={result => { onAdd(result.key); setOpen(false); }}
                        onClose={() => setOpen(false)}
                        placeholder={searchPlaceholder}
                    />
                </div>
            )}
        </div>
    );

};

const PawnWindow: React.FC<Props> = ({ pawn: initialPawn, customization, isNew, onCategoryChange, onSaved, onDeleted, onDirtyChange }) => {

    const { language } = useLanguage();
    const { uploading, triggerUpload, deleteImage } = useImageUpload();

    const [pawn, setPawn] = useState<Pawn>(() => new Pawn(initialPawn));
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [pendingDelete, setPendingDelete] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [kindOpen, setKindOpen] = useState(false);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [tempTag, setTempTag] = useState('');
    const [activeTab, setActiveTab] = useState<Tab | null>(null);

    const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isDirtyRef = useRef(false);
    const isFirstRender = useRef(true);
    const categoryRef = useRef<HTMLDivElement>(null);
    const kindRef = useRef<HTMLDivElement>(null);
    const pawnRef = useRef(pawn);
    pawnRef.current = pawn;

    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        if (isDirtyRef.current) return;
        setPawn(new Pawn(initialPawn));
        setSaveStatus('idle');
        setPendingDelete(false);
    }, [initialPawn]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) setCategoryOpen(false);
            if (kindRef.current && !kindRef.current.contains(e.target as Node)) setKindOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const scheduleAutosave = useCallback((updated: Pawn) => {
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
        const ok = await dbRegister(`entries/${pawn.key}`, pawn);
        if (ok) { setSaveStatus('saved'); onSaved(); }
        else setSaveStatus('error');
    };

    const update = () => {
        const updated = new Pawn(pawn);
        setPawn(updated);
        scheduleAutosave(updated);
    };

    const handleDelete = async () => {
        if (!pendingDelete) { setPendingDelete(true); return; }
        const ok = await dbDeregister(`entries/${pawn.key}`);
        if (ok) onDeleted();
    };

    const addAction = () => { pawn.actions.push({ name: '', description: '' }); update(); };
    const removeAction = (actionIndex: number) => { pawn.actions.splice(actionIndex, 1); update(); };

    const addDropBatch = () => { pawn.dropBatches.push({ chance: 0, drops: [] }); update(); };
    const removeDropBatch = (batchIndex: number) => { pawn.dropBatches.splice(batchIndex, 1); update(); };
    const setBatchChance = (batchIndex: number, value: number) => {
        pawn.dropBatches[batchIndex].chance = Math.max(0, Math.min(100, value));
        update();
    };
    const addDrop = async (batchIndex: number, key: string) => {
        const entry = await dbFetch(`entries/${key}`);
        if (!(entry instanceof Item)) return;
        const instance = new ItemInstance(entry);
        pawnRef.current.dropBatches[batchIndex].drops.push({ weight: 1, minDropAmount: 1, maxDropAmount: 1, item: instance });
        const updated = new Pawn(pawnRef.current);
        setPawn(updated);
        scheduleAutosave(updated);
    };
    const removeDrop = (batchIndex: number, dropIndex: number) => { pawn.dropBatches[batchIndex].drops.splice(dropIndex, 1); update(); };
    const setDropWeight = (batchIndex: number, dropIndex: number, value: number) => {
        pawn.dropBatches[batchIndex].drops[dropIndex].weight = Math.max(1, value);
        update();
    };
    const setDropMinAmount = (batchIndex: number, dropIndex: number, value: number) => {
        pawn.dropBatches[batchIndex].drops[dropIndex].minDropAmount = Math.max(1, value);
        update();
    };
    const setDropMaxAmount = (batchIndex: number, dropIndex: number, value: number) => {
        pawn.dropBatches[batchIndex].drops[dropIndex].maxDropAmount = Math.max(1, value);
        update();
    };

    const NameContainer = () => (
        customization ? (
            <input
                className={styles.nameInput}
                value={pawn.name || ''}
                onChange={e => { pawn.name = e.target.value; update(); }}
                placeholder={t({ text: 'name', language, mode: 'UPPERCASE' })}
            />
        ) : (<div className={styles.nameDisplay}>{pawn.name || '—'}</div>)
    )

    const DescriptionContainer = () => (
        customization ?
        (
            <textarea
                className={styles.descriptionInput}
                value={pawn.description || ''}
                onChange={e => { pawn.description = e.target.value; update(); }}
                placeholder={t({ text: 'description', language, mode: 'PLAIN_FIRST_UPPER' })}
            />
        ) : (<div className={styles.descriptionDisplay}>{pawn.description || '—'}</div>)
    )

    const ImageContainer = () => <>
            <div
                className={`${styles.imageContainer}${customization ? ` ${styles.imageContainerClickable}` : ''}`}
                onClick={() => { if (!customization) return; triggerUpload(pawn.key, path => { pawn.image = path; update(); }); }}
            >
                <img className={styles.imageImg} src={getImageUrl(pawn.image, pawn.category)} alt={pawn.name || ''} />
                {customization && (
                    <div className={styles.imageOverlay}>
                        {uploading ? '...' : '↑'}
                    </div>
                )}
                {customization && pawn.image && (
                    <button
                        className={styles.imageDeleteBtn}
                        onClick={e => {
                            e.stopPropagation();
                            deleteImage(pawn.image!, () => { pawn.image = null; update(); });
                        }}
                        title="Remove image"
                    >×</button>
                )}
            </div>
    </>

    const KeyContainer = () => <>
        <div className={styles.keyLabel}>{pawn.key}</div>
    </>

    const CategoryContainer = () => <>
        <div className={styles.categoryDropdown} ref={categoryRef}>
            <button
                className={styles.categoryBtn}
                onClick={customization ? () => setCategoryOpen(o => !o) : undefined}
                disabled={!customization}
            >
                {t({ text: pawn.category, language, mode: 'TITLECASE' })}
                {customization && <span className={styles.dropdownCaret}>▾</span>}
            </button>
            {categoryOpen && (
                <div className={styles.dropdownMenu}>
                    {ALL_CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            className={`${styles.dropdownOption}${cat === pawn.category ? ` ${styles.dropdownOptionActive}` : ''}`}
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
            {pawn.tags.map((tag, i) => (
                <div key={i} className={styles.tag}>
                    <span>{tag}</span>
                    {customization && <button className={styles.tagRemove} onClick={() => { pawn.tags.splice(i, 1); update(); }}>×</button>}
                </div>
            ))}
            {customization && (
                isAddingTag ? (
                    <input
                        autoFocus
                        className={styles.tagInput}
                        value={tempTag}
                        onChange={e => setTempTag(e.target.value)}
                        onBlur={() => { if(tempTag.trim()) { pawn.tags.push(tempTag.trim()); update(); } setIsAddingTag(false); setTempTag(''); }}
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
                    {t({ text: pawn.kind, language, mode: 'TITLECASE' })}
                    {customization && <span className={styles.dropdownCaret}>▾</span>}
                </button>
                {kindOpen && (
                    <div className={styles.dropdownMenu}>
                        {PAWN_KINDS.map(k => (
                            <button
                                key={k}
                                className={`${styles.dropdownOption}${k === pawn.kind ? ` ${styles.dropdownOptionActive}` : ''}`}
                                onClick={() => { setKindOpen(false); pawn.kind = k; update(); }}
                            >
                                {t({ text: k, language, mode: 'TITLECASE' })}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </>

    const renderAttributeField = (spec: AttributeSpec, onChange: (value: number) => void, pathBonus: number = 0, isPath: boolean = false) => {
        const base = pawn.constellation[spec.field];
        const total = base + pathBonus;
        const delta = total - base;
        return (
            <NumberFieldCard
                key={spec.field}
                label={t({ text: spec.labelKey, language, mode: 'UPPERCASE' })}
                value={base}
                viewValue={total}
                suffix={delta !== 0 ? `(${delta > 0 ? '+' : ''}${delta})` : undefined}
                customization={customization}
                onChange={onChange}
                min={isPath ? undefined : 0}
                className={`${styles.attributeFieldCard}${isPath ? ` ${styles.pathFieldCard}` : ''}`}
            />
        );
    };

    const ConstellationContainer = () => <>
        <div>
            <div className={styles.sectionLabel}>
                {t({ text: 'constellation', language, mode: 'UPPERCASE' })}
            </div>
            <div className={styles.pathRows}>
                {PATH_GROUPS.map(group => {
                    const pathTotal = pawn.constellation[group.path.field];
                    return (
                        <div className={styles.fieldsList} key={group.path.field}>
                            {renderAttributeField(group.path, v => { pawn.constellation[group.path.field] = v; update(); }, 0, true)}
                            {group.attributes.map(attr => renderAttributeField(attr, v => { pawn.constellation[attr.field] = v; update(); }, pathTotal))}
                        </div>
                    );
                })}
            </div>
        </div>
    </>

    const ActionsContainer = () => {
        if (!customization && pawn.actions.length === 0) return null;
        return (
            <div className={styles.modifiersSection}>
                <div className={styles.sectionLabel}>{t({ text: 'actions', language, mode: 'UPPERCASE' })}</div>
                <div className={styles.modifiersList}>
                    {pawn.actions.map((action: Action, actionIndex) => (
                        <div key={actionIndex} className={styles.modifierCard}>
                            {customization ? (
                                <input
                                    className={styles.modifierNameInput}
                                    value={action.name}
                                    onChange={e => { pawn.actions[actionIndex].name = e.target.value; update(); }}
                                    placeholder={t({ text: 'name', language, mode: 'UPPERCASE' })}
                                />
                            ) : <div className={styles.modifierNameDisplay}>{action.name || '—'}</div>}

                            {customization ? (
                                <textarea
                                    className={styles.modifierDescInput}
                                    value={action.description || ''}
                                    onChange={e => { pawn.actions[actionIndex].description = e.target.value; update(); }}
                                    placeholder={t({ text: 'description', language, mode: 'PLAIN_FIRST_UPPER' })}
                                />
                            ) : <div className={styles.modifierDescDisplay}>{action.description || '—'}</div>}

                            {customization && <button className={styles.modifierRemove} onClick={() => removeAction(actionIndex)}>×</button>}
                        </div>
                    ))}
                    {customization && (
                        <button className={styles.addModifierBtn} onClick={addAction}>
                            + {t({ text: 'action', language, mode: 'UPPERCASE' })}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const StatsContainer = () => <>
        <div>
            <div className={styles.sectionLabel}>
                {t({ text: 'stats', language, mode: 'UPPERCASE' })}
            </div>
            <div className={`${styles.fieldsList} ${styles.fieldsListCentered}`}>
                <NumberFieldCard
                    label={t({ text: 'max-health', language, mode: 'UPPERCASE' })}
                    value={pawn.maxHealth}
                    customization={customization}
                    onChange={v => { pawn.maxHealth = Math.max(0, v); update(); }}
                    min={0}
                />
                <NumberFieldCard
                    label={t({ text: 'MOVEMENT', language, mode: 'UPPERCASE' })}
                    value={pawn.movement}
                    customization={customization}
                    onChange={v => { pawn.movement = Math.max(0, v); update(); }}
                    min={0}
                />
                <NumberFieldCard
                    label={t({ text: 'RANGE', language, mode: 'UPPERCASE' })}
                    value={pawn.range}
                    customization={customization}
                    onChange={v => { pawn.range = Math.max(0, v); update(); }}
                    min={0}
                />
            </div>
            <div className={styles.aspectColumns}>
                {ASPECT_KINDS.map(kind => (
                    <div className={styles.aspectColumn} key={kind.field}>
                        <div className={styles.aspectColumnHeader}>
                            {t({ text: kind.labelKey, language, mode: 'UPPERCASE' })}
                        </div>
                        {ASPECT_FIELD_GROUPS.map((group, i) => (
                            <div className={styles.aspectRow} key={i}>
                                {group.map(field => (
                                    <NumberFieldCard
                                        key={field}
                                        label={t({ text: field, language, mode: 'UPPERCASE' })}
                                        value={pawn[kind.field][field] ?? 0}
                                        customization={customization}
                                        onChange={v => { pawn[kind.field][field] = Math.max(0, v); update(); }}
                                        min={0}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    </>

    const DropRow = (drop: Drop, batchIndex: number, dropIndex: number) => (
        <div className={styles.dropRow} key={dropIndex}>
            <div className={styles.recipeSlotWrapper}>
                <div className={styles.recipeSlotCell}>
                    <img className={styles.recipeSlotImage} src={getImageUrl(drop.item.reference.image, 'ITEM')} alt={drop.item.reference.name || ''} draggable={false} />
                </div>
                <div className={styles.recipeSlotName}>{drop.item.reference.name || '—'}</div>
            </div>
            <NumberFieldCard
                label={t({ text: 'weight', language, mode: 'UPPERCASE' })}
                value={drop.weight}
                customization={customization}
                onChange={v => setDropWeight(batchIndex, dropIndex, v)}
                min={1}
            />
            <NumberFieldCard
                label={t({ text: 'min-drop-amount', language, mode: 'UPPERCASE' })}
                value={drop.minDropAmount}
                customization={customization}
                onChange={v => setDropMinAmount(batchIndex, dropIndex, v)}
                min={1}
            />
            <NumberFieldCard
                label={t({ text: 'max-drop-amount', language, mode: 'UPPERCASE' })}
                value={drop.maxDropAmount}
                customization={customization}
                onChange={v => setDropMaxAmount(batchIndex, dropIndex, v)}
                min={1}
            />
            {customization && (
                <button className={styles.effectRemove} onClick={() => removeDrop(batchIndex, dropIndex)}>×</button>
            )}
        </div>
    );

    const DropBatchBlock = (batch: DropBatch, batchIndex: number) => (
        <div className={styles.catalogueRecipeBlock} key={batchIndex}>
            {customization && (
                <button className={styles.modifierRemove} onClick={() => removeDropBatch(batchIndex)}>×</button>
            )}
            <div className={styles.fieldsList}>
                <NumberFieldCard
                    label={t({ text: 'chance', language, mode: 'UPPERCASE' })}
                    value={batch.chance}
                    customization={customization}
                    onChange={v => setBatchChance(batchIndex, v)}
                    min={0}
                />
            </div>
            <div className={styles.dropRowsList}>
                {batch.drops.map((drop, dropIndex) => DropRow(drop, batchIndex, dropIndex))}
                {customization && (
                    <AddDropSlot onAdd={key => addDrop(batchIndex, key)} searchPlaceholder={t({ text: 'search-material', language, mode: 'PLAIN_FIRST_UPPER' })} />
                )}
            </div>
        </div>
    );

    const DropsContainer = () => {
        if (!customization && pawn.dropBatches.length === 0) return null;
        return (
            <div>
                <div className={styles.sectionLabel}>{t({ text: 'drops', language, mode: 'UPPERCASE' })}</div>
                {pawn.dropBatches.map((batch, batchIndex) => DropBatchBlock(batch, batchIndex))}
                {customization && (
                    <button className={styles.addModifierBtn} onClick={addDropBatch}>
                        + {t({ text: 'drop-batch', language, mode: 'UPPERCASE' })}
                    </button>
                )}
            </div>
        );
    };

    const TabsContainer = () => <>
        <div className={styles.tabRow}>
            {TABS.map(tabKey => (
                <button
                    key={tabKey}
                    className={`${styles.tabBtn}${activeTab === tabKey ? ` ${styles.tabBtnActive}` : ''}`}
                    onClick={() => setActiveTab(prev => prev === tabKey ? null : tabKey)}
                >
                    {t({ text: tabKey, language, mode: 'UPPERCASE' })}
                </button>
            ))}
        </div>
    </>

    const TabContentContainer = () => {
        if (activeTab === 'constellation') return ConstellationContainer();
        if (activeTab === 'actions') return ActionsContainer();
        if (activeTab === 'stats') return StatsContainer();
        if (activeTab === 'drops') return DropsContainer();
        return null;
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
            {TabsContainer()}
            {TabContentContainer()}
            {customization ? Footer() : null}
        </div>
    );

};


export default PawnWindow;
