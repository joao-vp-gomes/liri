// frontend/src/pages/CodexPage/entryWindows/RecipeSlot.tsx


import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';
import { getImageUrl } from '../../../services/useImageUpload';
import type { Modifier } from '../../../../../models/utils/modifier.ts';
import type { Effect } from '../../../../../models/utils/effect.ts';
import { useClampedPosition, type Anchor } from '../../../utils/useClampedPosition';

import styles from './entryWindows.module.css';
import slotStyles from './Inventory/Inventory.module.css';


interface Props {
    image: string | null;
    name: string | null;
    quantity: number;
    editable?: boolean;
    onRemove?: () => void;
    onQuantityChange?: (value: number) => void;
    quirks?: Modifier[];
    onQuirksChange?: (quirks: Modifier[]) => void;
    draggable?: boolean;
    onDragStart?: () => void;
}

const RecipeSlot: React.FC<Props> = ({ image, name, quantity, editable, onRemove, onQuantityChange, quirks, onQuirksChange, draggable, onDragStart }) => {

    const { language } = useLanguage();
    const [editing, setEditing] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [panelPos, setPanelPos] = useState<Anchor | null>(null);
    const quantityEditable = !!(editable && onQuantityChange);
    const quirksEditable = !!(editable && onQuirksChange);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { ref: panelRef, style: panelStyle } = useClampedPosition(panelPos);

    useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

    const openExpand = () => {
        if (quirks === undefined) return;
        if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect) setPanelPos({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
        setExpanded(true);
    };
    const scheduleCloseExpand = () => {
        closeTimerRef.current = setTimeout(() => setExpanded(false), 150);
    };

    const updateQuirk = (index: number, patch: Partial<Modifier>) => {
        if (!quirks || !onQuirksChange) return;
        const next = [...quirks];
        next[index] = { ...next[index], ...patch };
        onQuirksChange(next);
    };
    const removeQuirk = (index: number) => {
        if (!quirks || !onQuirksChange) return;
        onQuirksChange(quirks.filter((_, i) => i !== index));
    };
    const addQuirk = () => {
        if (!quirks || !onQuirksChange) return;
        onQuirksChange([...quirks, { name: '', description: '', effects: [] }]);
    };
    const updateQuirkEffect = (quirkIndex: number, effectIndex: number, patch: Partial<Effect>) => {
        if (!quirks || !onQuirksChange) return;
        const next = [...quirks];
        const effects = [...next[quirkIndex].effects];
        effects[effectIndex] = { ...effects[effectIndex], ...patch };
        next[quirkIndex] = { ...next[quirkIndex], effects };
        onQuirksChange(next);
    };
    const removeQuirkEffect = (quirkIndex: number, effectIndex: number) => {
        if (!quirks || !onQuirksChange) return;
        const next = [...quirks];
        next[quirkIndex] = { ...next[quirkIndex], effects: next[quirkIndex].effects.filter((_, i) => i !== effectIndex) };
        onQuirksChange(next);
    };
    const addQuirkEffect = (quirkIndex: number) => {
        if (!quirks || !onQuirksChange) return;
        const next = [...quirks];
        next[quirkIndex] = { ...next[quirkIndex], effects: [...next[quirkIndex].effects, { identifier: '', mode: 'ADDER', value: 0 }] };
        onQuirksChange(next);
    };

    return (
        <div
            className={styles.recipeSlotWrapper}
            ref={wrapperRef}
            onMouseEnter={openExpand}
            onMouseLeave={scheduleCloseExpand}
        >
            <div
                className={styles.recipeSlotCell}
                draggable={!!draggable}
                onDragStart={e => {
                    if (!draggable) { e.preventDefault(); return; }
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', 'liri-slot');
                    onDragStart?.();
                }}
            >
                <img className={styles.recipeSlotImage} src={getImageUrl(image, 'ITEM')} alt={name || ''} draggable={false} />
                {editable && onRemove && (
                    <button className={styles.recipeSlotRemove} onClick={onRemove}>×</button>
                )}
            </div>
            <div className={styles.recipeSlotName}>{name || '—'}</div>
            {quantityEditable && editing ? (
                <input
                    autoFocus
                    type="number"
                    className={styles.recipeSlotQtyInput}
                    defaultValue={quantity}
                    onFocus={e => e.currentTarget.select()}
                    onBlur={e => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v)) onQuantityChange!(Math.max(1, v)); setEditing(false); }}
                    onKeyDown={e => {
                        if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditing(false);
                    }}
                />
            ) : (
                <div
                    className={styles.recipeSlotQty}
                    onClick={() => quantityEditable && setEditing(true)}
                >×{quantity}</div>
            )}

            {expanded && quirks !== undefined && panelPos && (
                <div
                    className={slotStyles.slotExpandPanel}
                    style={panelStyle}
                    ref={panelRef}
                    onMouseEnter={openExpand}
                    onMouseLeave={scheduleCloseExpand}
                >
                    <div className={slotStyles.slotExpandName}>{name || '—'}</div>
                    <div className={styles.modifiersSection}>
                        <div className={slotStyles.slotExpandQuirksLabel}>{t({ text: 'quirks', language, mode: 'UPPERCASE' })}</div>
                        {quirks.length === 0 && !quirksEditable && (
                            <div className={slotStyles.slotExpandQuirksEmpty}>—</div>
                        )}
                        <div className={styles.modifiersList}>
                            {quirks.map((quirk, quirkIndex) => (
                                <div key={quirkIndex} className={styles.modifierCard}>
                                    {quirksEditable ? (
                                        <input
                                            className={styles.modifierNameInput}
                                            value={quirk.name}
                                            onChange={e => updateQuirk(quirkIndex, { name: e.target.value })}
                                            placeholder={t({ text: 'name', language, mode: 'UPPERCASE' })}
                                        />
                                    ) : <div className={styles.modifierNameDisplay}>{quirk.name || '—'}</div>}

                                    {quirksEditable ? (
                                        <textarea
                                            className={styles.modifierDescInput}
                                            value={quirk.description || ''}
                                            onChange={e => updateQuirk(quirkIndex, { description: e.target.value })}
                                            placeholder={t({ text: 'description', language, mode: 'PLAIN_FIRST_UPPER' })}
                                        />
                                    ) : <div className={styles.modifierDescDisplay}>{quirk.description || '—'}</div>}

                                    {quirksEditable && (
                                        <div className={styles.effectsList}>
                                            {quirk.effects.map((effect, effectIndex) => (
                                                <div key={effectIndex} className={styles.effectRow}>
                                                    <input
                                                        className={styles.effectIdentifierInput}
                                                        value={effect.identifier}
                                                        onChange={e => updateQuirkEffect(quirkIndex, effectIndex, { identifier: e.target.value })}
                                                        placeholder={t({ text: 'identifier', language, mode: 'LOWERCASE' })}
                                                    />
                                                    <select
                                                        className={styles.effectKindSelect}
                                                        value={effect.mode}
                                                        onChange={e => updateQuirkEffect(quirkIndex, effectIndex, { mode: e.target.value as Effect['mode'] })}
                                                    >
                                                        <option value="ADDER">{t({ text: 'ADDER', language, mode: 'UPPERCASE' })}</option>
                                                        <option value="MULTIPLIER">{t({ text: 'MULTIPLIER', language, mode: 'UPPERCASE' })}</option>
                                                        <option value="SETTER">{t({ text: 'SETTER', language, mode: 'UPPERCASE' })}</option>
                                                    </select>
                                                    <div className={styles.effectValueControls}>
                                                        <button onClick={() => updateQuirkEffect(quirkIndex, effectIndex, { value: effect.value - 1 })}>−</button>
                                                        <span>{effect.value}</span>
                                                        <button onClick={() => updateQuirkEffect(quirkIndex, effectIndex, { value: effect.value + 1 })}>+</button>
                                                    </div>
                                                    <button className={styles.effectRemove} onClick={() => removeQuirkEffect(quirkIndex, effectIndex)}>×</button>
                                                </div>
                                            ))}
                                            <button className={styles.addEffectBtn} onClick={() => addQuirkEffect(quirkIndex)}>
                                                + {t({ text: 'effect', language, mode: 'UPPERCASE' })}
                                            </button>
                                        </div>
                                    )}
                                    {quirksEditable && (
                                        <button className={styles.modifierRemove} onClick={() => removeQuirk(quirkIndex)}>×</button>
                                    )}
                                </div>
                            ))}
                            {quirksEditable && (
                                <button className={styles.addModifierBtn} onClick={addQuirk}>
                                    + {t({ text: 'quirks', language, mode: 'UPPERCASE' })}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

};


export default RecipeSlot;
