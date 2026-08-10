// frontend/src/pages/ModerationPage/MemberCard.tsx


import React, { useEffect, useState } from 'react';
import { deleteUser } from '../../../services/adminActions';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';
import { dbFetch, dbRegister } from '../../../services/database';

import PROFILE_ICON_ANON from '../../../assets/profile-icon-anon.png';
import PROFILE_ICON_1 from '../../../assets/profile-icon-1.png';
import PROFILE_ICON_2 from '../../../assets/profile-icon-2.png';
import PROFILE_ICON_3 from '../../../assets/profile-icon-3.png';

import styles from '../ModerationPage.module.css';


const PROFILE_ICONS = [PROFILE_ICON_ANON, PROFILE_ICON_1, PROFILE_ICON_2, PROFILE_ICON_3];
const resolveImage  = (image?: number) => PROFILE_ICONS[image ?? 0] ?? PROFILE_ICON_ANON;

export interface UserDoc {
    uid: string;
    name?: string;
    role?: string;
    image?: number;
    characters?: string[];
}

const MemberCard: React.FC<{ user: UserDoc }> = ({ user }) => {

    const { language } = useLanguage();
    const isEmpty = !user.name;

    const [expanded, setExpanded] = useState(false);
    const [editName, setEditName] = useState(user.name ?? '');
    const [editImage, setEditImage] = useState(user.image ?? 1);
    const [editChars, setEditChars] = useState<[string, string, string]>([
        user.characters?.[0] ?? '',
        user.characters?.[1] ?? '',
        user.characters?.[2] ?? '',
    ]);
    const [charNames, setCharNames] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        if (!expanded) return;
        const keys = editChars.filter(Boolean);
        if (!keys.length) return;
        const load = async () => {
            const results: Record<string, string> = {};
            for (const key of keys) {
                const entry = await dbFetch(`entries/${key}`);
                results[key] = entry?.['name'] ?? key;
            }
            setCharNames(results);
        };
        load();
    }, [expanded]);

    const handleSave = async () => {
        setSaving(true); setStatus(null);
        const characters = editChars.filter(Boolean);
        const ok = await dbRegister(`users/${user.uid}`, { name: editName, image: editImage, characters });
        setStatus(ok ? 'saved' : 'error');
        setSaving(false);
    };

    const handleDelete = async () => {
        if(confirm(t({text: 'confirm-deletion', language: language, mode: 'PLAIN_FIRST_UPPER'}))) await deleteUser(user.uid);
    };

    const expandedCard = (
        <div className={styles.cardBody} >
            <div className={styles.cardUid}>{user.uid}</div>

            <div className={styles.cardIconPicker}>
                {[1, 2, 3].map(n => (
                    <button
                        key={n}
                        className={`${styles.iconBtn}${editImage === n ? ` ${styles.iconBtnActive}` : ''}`}
                        onClick={e =>  { setEditImage(n); e.stopPropagation() }}
                    >
                        <img loading="eager" src={PROFILE_ICONS[n]} alt={`icon ${n}`} />
                    </button>
                ))}
            </div>

            <div className={styles.cardField}>
                <span className={styles.cardFieldLabel}>{t({ text: 'name', language, mode: 'UPPERCASE' })}</span>
                <input className={styles.cardInput} value={editName} onClick={e=> { e.stopPropagation() }} onChange={e => setEditName(e.target.value)} />
            </div>

            <div className={styles.cardField}>
                <span className={styles.cardFieldLabel}>{t({ text: 'characters', language, mode: 'UPPERCASE' })}</span>
                {([0, 1, 2] as const).map(i => (
                    <div key={i} className={styles.charItem}>
                        <input
                            className={styles.cardInput}
                            value={editChars[i]}
                            placeholder={`${i + 1}`}
                            onClick={e=> { e.stopPropagation() }}
                            onChange={e => {
                                const next = [...editChars] as [string, string, string];
                                next[i] = e.target.value;
                                setEditChars(next);
                            }}
                        />
                        {editChars[i] && (
                            <span className={styles.charName}>{charNames[editChars[i]] ?? '…'}</span>
                        )}
                    </div>
                ))}
            </div>

            <div className={styles.cardActions}>
                <button className={styles.btnSave} onClick={e => { handleSave(); e.stopPropagation() }} disabled={saving}>
                    {saving ? '…' : t({ text: 'save', language, mode: 'UPPERCASE' })}
                </button>
                {status === 'saved' && <span className={styles.statusOk}>✓</span>}
                {status === 'error'  && <span className={styles.statusErr}>✕</span>}
                <button className={styles.btnDelete} onClick={e => { handleDelete(); e.stopPropagation() }}>
                    {t({ text: 'delete', language, mode: 'UPPERCASE' })}
                </button>
            </div>
        </div>
    );

    return (
        <div
            className={`${styles.card} ${expanded ? styles.cardExpanded : ''} ${isEmpty ? styles.cardEmpty : ''}`}
            onClick={() => setExpanded(e => !e)}
        >
            {
                (!expanded)
                ? (
                    <div className={styles.cardCollapsed}>
                        <img loading="eager" className={styles.cardIcon} src={resolveImage(user.image)} alt="" />
                        <span className={styles.cardName}>
                            {isEmpty
                                ? t({ text: 'new-member', language, mode: 'UPPERCASE' })
                                : (user.name ?? '—').toUpperCase()
                            }
                        </span>
                    </div>
                )
                : expandedCard
            }
        </div>
    );

};

export default MemberCard;