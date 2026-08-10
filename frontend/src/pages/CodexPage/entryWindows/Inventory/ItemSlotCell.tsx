// frontend/src/pages/CodexPage/entryWindows/Inventory/ItemSlotCell.tsx


import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { t } from '../../../../utils/localizer';
import { getImageUrl } from '../../../../services/useImageUpload';
import type { ItemInstance } from '../../../../../../models/utils/itemInstance.ts';
import type { Modifier } from '../../../../../../models/utils/modifier.ts';
import type { Effect } from '../../../../../../models/utils/effect.ts';
import FloatingSearch from '../../../../components/FloatingSearch/FloatingSearch';
import NumberFieldCard from '../NumberFieldCard';
import { useClampedPosition, type Anchor } from '../../../../utils/useClampedPosition';

import sharedStyles from '../entryWindows.module.css';
import styles from './Inventory.module.css';


export interface SlotAction {
    label: string;
    onClick: (quantity: number) => void;
    usesQuantity?: boolean;
    danger?: boolean;
}

interface Props {
    instance: ItemInstance | null;
    customization: boolean;
    topLabel: string;
    actions?: SlotAction[];
    onAddItem?: (key: string) => void;
    onEditDurability?: (value: number) => void;
    onEditStack?: (value: number) => void;
    onEditQuirks?: (quirks: Modifier[]) => void;
    onTransfer?: (targetCharacterKey: string, quantity: number) => void;
    draggable?: boolean;
    onDragStart?: () => void;
    onDropHere?: () => void;
}

const ItemSlotCell: React.FC<Props> = ({
    instance, customization, topLabel, actions = [], onAddItem,
    onEditDurability, onEditStack, onEditQuirks, onTransfer,
    draggable, onDragStart, onDropHere,
}) => {

    const { language } = useLanguage();
    const navigate = useNavigate();
    const reference = instance?.reference ?? null;

    const [menuPos, setMenuPos] = useState<Anchor | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [searchMode, setSearchMode] = useState<'add-item' | 'transfer' | null>(null);
    const [searchPos, setSearchPos] = useState<Anchor | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [panelPos, setPanelPos] = useState<Anchor | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { ref: menuRef, style: menuStyle } = useClampedPosition(menuPos);
    const { ref: panelRef, style: panelStyle } = useClampedPosition(panelPos);
    const { ref: searchRef, style: searchStyle } = useClampedPosition(searchPos);

    useEffect(() => {
        if (!menuPos) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuPos(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuPos]);

    useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

    const openExpand = () => {
        if (!instance) return;
        if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect) setPanelPos({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
        setExpanded(true);
    };
    const scheduleCloseExpand = () => {
        closeTimerRef.current = setTimeout(() => setExpanded(false), 150);
    };

    const handleClick = () => {
        if (!customization) {
            if (reference) navigate(`/codex?m=vis&e=${encodeURIComponent(reference.key)}`);
            return;
        }
        if (!instance && !onAddItem) return;
        if (instance) setQuantity(Math.min(instance.currentStack, instance.reference.stack));
        const rect = wrapperRef.current?.getBoundingClientRect();
        setMenuPos(rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } : { top: 0, bottom: 0, left: 0, right: 0 });
    };

    const quantityRelevant = instance && reference && instance.currentStack > 1 && (!!onTransfer || actions.some(a => a.usesQuantity !== false));

    const updateQuirk = (index: number, patch: Partial<Modifier>) => {
        if (!instance || !onEditQuirks) return;
        instance.quirks[index] = { ...instance.quirks[index], ...patch };
        onEditQuirks(instance.quirks);
    };
    const removeQuirk = (index: number) => {
        if (!instance || !onEditQuirks) return;
        onEditQuirks(instance.quirks.filter((_, i) => i !== index));
    };
    const addQuirk = () => {
        if (!instance || !onEditQuirks) return;
        onEditQuirks([...instance.quirks, { name: '', description: '', effects: [] }]);
    };
    const updateQuirkEffect = (quirkIndex: number, effectIndex: number, patch: Partial<Effect>) => {
        if (!instance || !onEditQuirks) return;
        const quirk = instance.quirks[quirkIndex];
        quirk.effects[effectIndex] = { ...quirk.effects[effectIndex], ...patch };
        onEditQuirks(instance.quirks);
    };
    const removeQuirkEffect = (quirkIndex: number, effectIndex: number) => {
        if (!instance || !onEditQuirks) return;
        const quirk = instance.quirks[quirkIndex];
        instance.quirks[quirkIndex] = { ...quirk, effects: quirk.effects.filter((_, i) => i !== effectIndex) };
        onEditQuirks(instance.quirks);
    };
    const addQuirkEffect = (quirkIndex: number) => {
        if (!instance || !onEditQuirks) return;
        const quirk = instance.quirks[quirkIndex];
        instance.quirks[quirkIndex] = { ...quirk, effects: [...quirk.effects, { identifier: '', mode: 'ADDER', value: 0 }] };
        onEditQuirks(instance.quirks);
    };

    return (
        <div
            className={styles.slotWrapper}
            ref={wrapperRef}
            onMouseEnter={openExpand}
            onMouseLeave={scheduleCloseExpand}
        >
            <div className={styles.slotTopLabel}>{topLabel}</div>
            <div
                className={`${styles.slotCell}${isDragOver ? ` ${styles.slotCellDragOver}` : ''}`}
                onClick={handleClick}
                draggable={customization && !!draggable}
                onDragStart={e => { if (!customization) { e.preventDefault(); return; } e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'liri-slot'); onDragStart?.(); }}
                onDragOver={e => { if (customization && onDropHere) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
                onDragEnter={e => { if (customization && onDropHere) { e.preventDefault(); setIsDragOver(true); } }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => { e.preventDefault(); setIsDragOver(false); if (customization) onDropHere?.(); }}
            >
                {reference && (
                    <img className={styles.slotImage} src={getImageUrl(reference.image, 'ITEM')} alt={reference.name || ''} draggable={false} />
                )}
            </div>
            <div className={styles.slotName}>
                {reference && instance ? `${reference.name || '—'}${instance.currentStack > 1 ? ` x${instance.currentStack}` : ''}` : ''}
            </div>

            {expanded && instance && reference && panelPos && (
                <div
                    className={styles.slotExpandPanel}
                    style={panelStyle}
                    ref={panelRef}
                    onMouseEnter={openExpand}
                    onMouseLeave={scheduleCloseExpand}
                >
                    <div className={styles.slotExpandName}>{reference.name || '—'}</div>

                    {reference.stack > 1 && (
                        <div className={styles.slotExpandField}>
                            <NumberFieldCard
                                label={t({ text: 'current-stack', language, mode: 'UPPERCASE' })}
                                value={instance.currentStack}
                                customization={customization && !!onEditStack}
                                onChange={v => onEditStack?.(Math.max(1, Math.min(reference.stack, v)))}
                                min={1}
                            />
                        </div>
                    )}

                    {instance.currentDurability !== null && (
                        <div className={styles.slotExpandField}>
                            <NumberFieldCard
                                label={t({ text: 'durability', language, mode: 'UPPERCASE' })}
                                value={instance.currentDurability}
                                customization={customization && !!onEditDurability}
                                onChange={v => onEditDurability?.(v)}
                                min={-1}
                                infiniteAt={-1}
                            />
                        </div>
                    )}

                    <div className={sharedStyles.modifiersSection}>
                        <div className={styles.slotExpandQuirksLabel}>{t({ text: 'quirks', language, mode: 'UPPERCASE' })}</div>
                        {instance.quirks.length === 0 && !(customization && onEditQuirks) && (
                            <div className={styles.slotExpandQuirksEmpty}>—</div>
                        )}
                        <div className={sharedStyles.modifiersList}>
                            {instance.quirks.map((quirk, quirkIndex) => (
                                <div key={quirkIndex} className={sharedStyles.modifierCard}>
                                    {customization && onEditQuirks ? (
                                        <input
                                            className={sharedStyles.modifierNameInput}
                                            value={quirk.name}
                                            onChange={e => updateQuirk(quirkIndex, { name: e.target.value })}
                                            placeholder={t({ text: 'name', language, mode: 'UPPERCASE' })}
                                        />
                                    ) : <div className={sharedStyles.modifierNameDisplay}>{quirk.name || '—'}</div>}

                                    {customization && onEditQuirks ? (
                                        <textarea
                                            className={sharedStyles.modifierDescInput}
                                            value={quirk.description || ''}
                                            onChange={e => updateQuirk(quirkIndex, { description: e.target.value })}
                                            placeholder={t({ text: 'description', language, mode: 'PLAIN_FIRST_UPPER' })}
                                        />
                                    ) : <div className={sharedStyles.modifierDescDisplay}>{quirk.description || '—'}</div>}

                                    {customization && onEditQuirks && (
                                        <div className={sharedStyles.effectsList}>
                                            {quirk.effects.map((effect, effectIndex) => (
                                                <div key={effectIndex} className={sharedStyles.effectRow}>
                                                    <input
                                                        className={sharedStyles.effectIdentifierInput}
                                                        value={effect.identifier}
                                                        onChange={e => updateQuirkEffect(quirkIndex, effectIndex, { identifier: e.target.value })}
                                                        placeholder={t({ text: 'identifier', language, mode: 'LOWERCASE' })}
                                                    />
                                                    <select
                                                        className={sharedStyles.effectKindSelect}
                                                        value={effect.mode}
                                                        onChange={e => updateQuirkEffect(quirkIndex, effectIndex, { mode: e.target.value as Effect['mode'] })}
                                                    >
                                                        <option value="ADDER">{t({ text: 'ADDER', language, mode: 'UPPERCASE' })}</option>
                                                        <option value="MULTIPLIER">{t({ text: 'MULTIPLIER', language, mode: 'UPPERCASE' })}</option>
                                                        <option value="SETTER">{t({ text: 'SETTER', language, mode: 'UPPERCASE' })}</option>
                                                    </select>
                                                    <div className={sharedStyles.effectValueControls}>
                                                        <button onClick={() => updateQuirkEffect(quirkIndex, effectIndex, { value: effect.value - 1 })}>−</button>
                                                        <span>{effect.value}</span>
                                                        <button onClick={() => updateQuirkEffect(quirkIndex, effectIndex, { value: effect.value + 1 })}>+</button>
                                                    </div>
                                                    <button className={sharedStyles.effectRemove} onClick={() => removeQuirkEffect(quirkIndex, effectIndex)}>×</button>
                                                </div>
                                            ))}
                                            <button className={sharedStyles.addEffectBtn} onClick={() => addQuirkEffect(quirkIndex)}>
                                                + {t({ text: 'effect', language, mode: 'UPPERCASE' })}
                                            </button>
                                        </div>
                                    )}
                                    {customization && onEditQuirks && (
                                        <button className={sharedStyles.modifierRemove} onClick={() => removeQuirk(quirkIndex)}>×</button>
                                    )}
                                </div>
                            ))}
                            {customization && onEditQuirks && (
                                <button className={sharedStyles.addModifierBtn} onClick={addQuirk}>
                                    + {t({ text: 'quirks', language, mode: 'UPPERCASE' })}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {menuPos && (
                <div className={styles.contextMenu} style={menuStyle} ref={menuRef}>
                    {instance
                        ? <>
                            <button
                                className={styles.contextMenuOption}
                                onClick={() => { navigate(`/codex?m=vis&e=${encodeURIComponent(reference!.key)}`); setMenuPos(null); }}
                            >
                                {t({ text: 'examine', language, mode: 'UPPERCASE' })}
                            </button>
                            {quantityRelevant && (
                                <div className={styles.menuQuantityRow}>
                                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                                    <span>{quantity}</span>
                                    <button onClick={() => setQuantity(q => Math.min(instance.currentStack, q + 1))}>+</button>
                                </div>
                            )}
                            {actions.map((action, i) => (
                                <button
                                    key={i}
                                    className={`${styles.contextMenuOption}${action.danger ? ` ${styles.contextMenuOptionDanger}` : ''}`}
                                    onClick={() => { action.onClick(action.usesQuantity === false ? 1 : quantity); setMenuPos(null); }}
                                >
                                    {action.label}
                                </button>
                            ))}
                            {onTransfer && (
                                <button
                                    className={styles.contextMenuOption}
                                    onClick={() => { setSearchPos(menuPos); setMenuPos(null); setSearchMode('transfer'); }}
                                >
                                    {t({ text: 'transfer', language, mode: 'UPPERCASE' })}
                                </button>
                            )}
                        </>
                        : onAddItem && (
                            <button
                                className={styles.contextMenuOption}
                                onClick={() => { setSearchPos(menuPos); setMenuPos(null); setSearchMode('add-item'); }}
                            >
                                {t({ text: 'add-item', language, mode: 'UPPERCASE' })}
                            </button>
                        )
                    }
                </div>
            )}

            {searchMode === 'add-item' && searchPos && (
                <div className={styles.searchAnchor} style={searchStyle} ref={searchRef}>
                    <FloatingSearch
                        categories={['ITEM']}
                        onSelect={result => { onAddItem?.(result.key); }}
                        onClose={() => setSearchMode(null)}
                        placeholder={t({ text: 'search-material', language, mode: 'PLAIN_FIRST_UPPER' })}
                    />
                </div>
            )}

            {searchMode === 'transfer' && searchPos && instance && (
                <div className={styles.searchAnchor} style={searchStyle} ref={searchRef}>
                    <FloatingSearch
                        categories={['CHARACTER']}
                        onSelect={result => { onTransfer?.(result.key, quantity); }}
                        onClose={() => setSearchMode(null)}
                        placeholder={t({ text: 'search-character', language, mode: 'PLAIN_FIRST_UPPER' })}
                    />
                </div>
            )}
        </div>
    );

};


export default ItemSlotCell;
