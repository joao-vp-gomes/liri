// frontend/src/components/ModerationPageCards/AnonCard.tsx


import React, { useState } from 'react';
import { deleteUser } from '../../../services/adminActions';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';
import PROFILE_ICON_ANON from '../../../assets/profile-icon-anon.png';

import styles from '../ModerationPage.module.css';


export interface AnonDoc {
    uid: string;
    name?: string;
    created_at?: string;
}
const AnonCard: React.FC<{ user: AnonDoc }> = ({ user }) => {
    const { language } = useLanguage();
    const [expanded, setExpanded] = useState(false);
    const handleDelete = async () => {
        await deleteUser(user.uid);
    };
    const formattedDate = user.created_at ? new Date(user.created_at).toLocaleString() : null;
    return (
        <div
            className={`${styles.card} ${expanded ? styles.cardExpanded : ''}`}
            onClick={() => !expanded && setExpanded(true)}
        >
            {
                (!expanded)
                    ? (
                        <div className={styles.cardCollapsed}>
                            <img loading="eager" className={styles.cardIcon} src={PROFILE_ICON_ANON} alt="" />
                            <span className={styles.cardName}>{(user.name ?? '—').toUpperCase()}</span>
                            {formattedDate && <span className={styles.cardDate}>{formattedDate}</span>}
                        </div>
                    )
                    : (
                        <div className={styles.cardBody} onClick={() => setExpanded(false)}>
                            <div className={styles.cardUid}>{user.uid}</div>
                            <div className={styles.cardName}>{(user.name ?? '—').toUpperCase()}</div>
                            {formattedDate && <div className={styles.cardDate}>{formattedDate}</div>}
                            <div className={styles.cardActions}>
                                <button className={styles.btnDelete} onClick={e => { handleDelete(); e.stopPropagation(); }}>
                                    {t({ text: 'delete', language, mode: 'UPPERCASE' })}
                                </button>
                            </div>
                        </div>
                    )
            }
        </div>
    );
};
export default AnonCard;
