// frontend/src/pages/ModerationPage/CreateMemberCard.tsx


import React, { useState } from 'react';
import { createUser } from '../../../services/adminActions';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';

import PROFILE_ICON_1 from '../../../assets/profile-icon-1.png';
import PROFILE_ICON_2 from '../../../assets/profile-icon-2.png';
import PROFILE_ICON_3 from '../../../assets/profile-icon-3.png';

import styles from '../ModerationPage.module.css';


const PROFILE_ICONS = [PROFILE_ICON_1, PROFILE_ICON_2, PROFILE_ICON_3];

export const CreateMemberCard: React.FC = () => {

    const { language } = useLanguage();
    const [expanded, setExpanded] = useState(false);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [image, setImage] = useState(1);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!name.trim() || !username.trim() || !password.trim()) {
            setStatus('error'); 
            return;
        }
        setSaving(true); setStatus(null);
        const ok = await createUser(username.trim(), password.trim(), name.trim(), image);
        if (ok) {
            setName(''); setUsername(''); setPassword(''); setImage(1);
            setStatus('saved');
            setExpanded(false);
        } else setStatus('error');
        setSaving(false);
    };

    const expandedCard = (
        <div className={styles.cardBody} onClick={e => e.stopPropagation()}>
            <button className={styles.cardClose} onClick={() => { setExpanded(false); setStatus(null); }}>-</button>

            <div className={styles.cardIconPicker}>
                {[1, 2, 3].map(n => (
                    <button
                        key={n}
                        className={`${styles.iconBtn}${image === n ? ` ${styles.iconBtnActive}` : ''}`}
                        onClick={() => setImage(n)}
                    >
                        <img loading="eager" src={PROFILE_ICONS[n - 1]} alt={`icon ${n}`} />
                    </button>
                ))}
            </div>

            <div className={styles.cardField}>
                <span className={styles.cardFieldLabel}>{t({ text: 'name', language, mode: 'UPPERCASE' })}</span>
                <input
                    className={styles.cardInput}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="—"
                />
            </div>

            <div className={styles.cardField}>
                <span className={styles.cardFieldLabel}>{t({ text: 'username', language, mode: 'UPPERCASE' })}</span>
                <input
                    className={styles.cardInput}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="—"
                />
            </div>

            <div className={styles.cardField}>
                <span className={styles.cardFieldLabel}>{t({ text: 'password', language, mode: 'UPPERCASE' })}</span>
                <input
                    className={styles.cardInput}
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="—"
                />
            </div>

            <div className={styles.cardActions}>
                <button className={styles.btnSave} onClick={handleCreate} disabled={saving}>
                    {saving ? '…' : t({ text: 'create', language, mode: 'UPPERCASE' })}
                </button>
                {status === 'saved' && <span className={styles.statusOk}>✓</span>}
                {status === 'error'  && <span className={styles.statusErr}>✕</span>}
            </div>
        </div>
    );

    return (
        <div
            className={`${styles.card} ${expanded ? styles.cardExpanded : ''} ${styles.cardEmpty}`}
            onClick={() => !expanded && setExpanded(true)}
        >
            {
                (!expanded)
                ? (
                    <div className={styles.cardCollapsed}>
                        <span className={styles.cardName}>+</span>
                    </div>
                ) 
                : expandedCard
            }
        </div>
    );

};

export default CreateMemberCard;