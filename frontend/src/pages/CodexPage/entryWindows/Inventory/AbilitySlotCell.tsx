// frontend/src/pages/CodexPage/entryWindows/Inventory/AbilitySlotCell.tsx


import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { t } from '../../../../utils/localizer';
import { getImageUrl } from '../../../../services/useImageUpload';
import type { AbilityInstance } from '../../../../../../models/utils/abilityInstance.ts';
import FloatingSearch from '../../../../components/FloatingSearch/FloatingSearch';
import { useClampedPosition, type Anchor } from '../../../../utils/useClampedPosition';

import styles from './Inventory.module.css';


interface Props {
    instance: AbilityInstance | null;
    customization: boolean;
    topLabel: string;
    onInsert: (key: string) => void;
    onRemove: () => void;
    draggable?: boolean;
    onDragStart?: () => void;
    onDropHere?: () => void;
}

const AbilitySlotCell: React.FC<Props> = ({ instance, customization, topLabel, onInsert, onRemove, draggable, onDragStart, onDropHere }) => {

    const { language } = useLanguage();
    const navigate = useNavigate();
    const reference = instance?.reference ?? null;

    const [menuPos, setMenuPos] = useState<Anchor | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchPos, setSearchPos] = useState<Anchor | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const { ref: menuRef, style: menuStyle } = useClampedPosition(menuPos);
    const { ref: searchRef, style: searchStyle } = useClampedPosition(searchPos);

    useEffect(() => {
        if (!menuPos) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuPos(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuPos]);

    const handleClick = () => {
        if (!customization) {
            if (reference) navigate(`/codex?m=vis&e=${encodeURIComponent(reference.key)}`);
            return;
        }
        const rect = wrapperRef.current?.getBoundingClientRect();
        setMenuPos(rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } : { top: 0, bottom: 0, left: 0, right: 0 });
    };

    return (
        <div className={styles.slotWrapper} ref={wrapperRef}>
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
                    <img className={styles.slotImage} src={getImageUrl(reference.image, 'ABILITY')} alt={reference.name || ''} draggable={false} />
                )}
            </div>
            <div className={styles.slotName}>{reference ? (reference.name || '—') : ''}</div>

            {menuPos && (
                <div className={styles.contextMenu} style={menuStyle} ref={menuRef}>
                    {instance ? (
                        <>
                            <button
                                className={styles.contextMenuOption}
                                onClick={() => { navigate(`/codex?m=vis&e=${encodeURIComponent(reference!.key)}`); setMenuPos(null); }}
                            >
                                {t({ text: 'examine', language, mode: 'UPPERCASE' })}
                            </button>
                            <button
                                className={styles.contextMenuOption}
                                onClick={() => { onRemove(); setMenuPos(null); }}
                            >
                                {t({ text: 'remove-ability', language, mode: 'UPPERCASE' })}
                            </button>
                        </>
                    ) : (
                        <button
                            className={styles.contextMenuOption}
                            onClick={() => { setSearchPos(menuPos); setMenuPos(null); setSearchOpen(true); }}
                        >
                            {t({ text: 'insert-ability', language, mode: 'UPPERCASE' })}
                        </button>
                    )}
                </div>
            )}

            {searchOpen && searchPos && (
                <div className={styles.searchAnchor} style={searchStyle} ref={searchRef}>
                    <FloatingSearch
                        categories={['ABILITY']}
                        onSelect={result => { onInsert(result.key); }}
                        onClose={() => setSearchOpen(false)}
                        placeholder={t({ text: 'search-ability', language, mode: 'PLAIN_FIRST_UPPER' })}
                    />
                </div>
            )}
        </div>
    );

};


export default AbilitySlotCell;
