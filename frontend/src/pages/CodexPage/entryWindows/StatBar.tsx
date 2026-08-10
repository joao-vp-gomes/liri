// frontend/src/pages/CodexPage/entryWindows/StatBar.tsx


import React, { useState } from 'react';

import styles from './entryWindows.module.css';


interface Props {
    label: string;
    value: number;
    maxValue: number;
    customization: boolean;
    onChange: (value: number) => void;
    className?: string;
    large?: boolean;
}

const StatBar: React.FC<Props> = ({ label, value, maxValue, customization, onChange, className, large }) => {

    const [editing, setEditing] = useState(false);

    const ratio = maxValue > 0 ? Math.max(0, Math.min(1, value / maxValue)) : 0;

    const clamp = (v: number) => Math.max(0, Math.min(maxValue, v));

    const commit = (raw: string) => {
        const parsed = parseInt(raw, 10);
        if (!Number.isNaN(parsed)) onChange(clamp(parsed));
        setEditing(false);
    };

    return (
        <div className={`${styles.statBar} ${large ? styles.statBarLarge : styles.statBarSmall}${className ? ` ${className}` : ''}`}>
            <div className={styles.statBarLabel}>{label}</div>
            <div className={styles.statBarTrack}>
                {customization && (
                    <button
                        className={styles.statBarArrow}
                        disabled={value <= 0}
                        onClick={() => onChange(clamp(value - 1))}
                    >&lt;</button>
                )}
                <div className={styles.statBarLineTrack}>
                    <div className={`${styles.statBarLineFill} ${styles.statBarLineFillEnd}`} style={{ width: `${ratio * 100}%` }} />
                </div>
                {editing ? (
                    <input
                        autoFocus
                        type="number"
                        className={styles.statBarValueInput}
                        defaultValue={value}
                        onFocus={e => e.currentTarget.select()}
                        onBlur={e => commit(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commit((e.currentTarget as HTMLInputElement).value);
                            if (e.key === 'Escape') setEditing(false);
                        }}
                    />
                ) : (
                    <span className={styles.statBarValue} onClick={() => customization && setEditing(true)}>
                        {value}/{maxValue}
                    </span>
                )}
                <div className={styles.statBarLineTrack}>
                    <div className={styles.statBarLineFill} style={{ width: `${ratio * 100}%` }} />
                </div>
                {customization && (
                    <button
                        className={styles.statBarArrow}
                        disabled={value >= maxValue}
                        onClick={() => onChange(clamp(value + 1))}
                    >&gt;</button>
                )}
            </div>
        </div>
    );

};


export default StatBar;
