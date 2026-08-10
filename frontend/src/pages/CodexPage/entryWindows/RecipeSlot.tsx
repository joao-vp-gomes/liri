// frontend/src/pages/CodexPage/entryWindows/RecipeSlot.tsx


import React, { useState } from 'react';
import { getImageUrl } from '../../../services/useImageUpload';

import styles from './entryWindows.module.css';


interface Props {
    image: string | null;
    name: string | null;
    quantity: number;
    editable?: boolean;
    onRemove?: () => void;
    onQuantityChange?: (value: number) => void;
    draggable?: boolean;
    onDragStart?: () => void;
}

const RecipeSlot: React.FC<Props> = ({ image, name, quantity, editable, onRemove, onQuantityChange, draggable, onDragStart }) => {

    const [editing, setEditing] = useState(false);
    const quantityEditable = !!(editable && onQuantityChange);

    return (
        <div className={styles.recipeSlotWrapper}>
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
        </div>
    );

};


export default RecipeSlot;
