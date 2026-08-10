// frontend/src/pages/CodexPage/entryWindows/NumberFieldCard.tsx


import React, { useState } from 'react';

import styles from './entryWindows.module.css';


interface Props {
    label: string;
    value: number;
    customization: boolean;
    onChange: (value: number) => void;
    min?: number;
    step?: number;
    infiniteAt?: number;
    viewValue?: number;
    suffix?: string;
    className?: string;
    maxValue?: number;
}

const NumberFieldCard: React.FC<Props> = ({ label, value, customization, onChange, min, step = 1, infiniteAt, viewValue: viewValueOverride, suffix, className, maxValue }) => {

    const [editing, setEditing] = useState(false);

    const clamp = (v: number) => (min !== undefined ? Math.max(min, v) : v);
    const viewValue = infiniteAt !== undefined && value === infiniteAt ? '∞' : (viewValueOverride ?? value);

    const commit = (raw: string) => {
        const parsed = parseInt(raw, 10);
        if (!Number.isNaN(parsed)) onChange(clamp(parsed));
        setEditing(false);
    };

    return (
        <div className={`${styles.fieldCard}${className ? ` ${className}` : ''}`}>
            <div className={styles.fieldName}>{label}</div>
            {!customization ? (
                <div className={styles.fieldValueDisplay}>{viewValue}{maxValue !== undefined ? `/${maxValue}` : ''}</div>
            ) : editing ? (
                <input
                    autoFocus
                    type="number"
                    className={styles.fieldValueInput}
                    defaultValue={value}
                    onFocus={e => e.currentTarget.select()}
                    onBlur={e => commit(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') commit((e.currentTarget as HTMLInputElement).value);
                        if (e.key === 'Escape') setEditing(false);
                    }}
                />
            ) : (
                <div className={styles.fieldValueControls}>
                    <button onClick={() => onChange(clamp(value - step))}>−</button>
                    <span className={styles.fieldValueClickable} onClick={() => setEditing(true)}>{value}</span>
                    {maxValue !== undefined && <span className={styles.fieldValueSuffix}>/{maxValue}</span>}
                    {suffix && <span className={styles.fieldValueSuffix}>{suffix}</span>}
                    <button onClick={() => onChange(value + step)}>+</button>
                </div>
            )}
        </div>
    );

};


export default NumberFieldCard;
