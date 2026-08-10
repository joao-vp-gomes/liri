// frontend/src/components/Header/Header.tsx


import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '../../contexts/LanguageContext';
import { t, format } from '../../utils/localizer';
import { useNavigate } from 'react-router-dom';
import { dbDeregister, dbRegister } from '../../services/database';

import LOGO_NAME_SOURCE  from '../../assets/logo-name.png';
import PROFILE_ICON_ANON from '../../assets/profile-icon-anon.png';
import PROFILE_ICON_1 from '../../assets/profile-icon-1.png';
import PROFILE_ICON_2 from '../../assets/profile-icon-2.png';
import PROFILE_ICON_3 from '../../assets/profile-icon-3.png';

import styles from './Header.module.css';


const PROFILE_ICONS = [PROFILE_ICON_1, PROFILE_ICON_2, PROFILE_ICON_3];

const Header: React.FC = () => {

    const navigate = useNavigate();

    const { account, setAccount } = useAuth();
    const { language, setLanguage } = useLanguage();

    const [menuOpen, setMenuOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const langRef = useRef<HTMLDivElement>(null);

    const isAnon = account?.role === 'anon';
    const image  = isAnon
        ? PROFILE_ICON_ANON
        : PROFILE_ICONS[((account?.image ?? 1) - 1)] ?? PROFILE_ICON_1;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
            if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleDisconnect = async () => {
        setMenuOpen(false);
        navigate('/home');
        if (isAnon && account?.user) await dbDeregister(`users/${account.user.id}`);
        await supabase.auth.signOut();
    };

    const handleIconSelect = async (iconNumber: number) => {
        setAccount({ image: iconNumber });
        if (!account?.user) return;
        await dbRegister(`users/${account.user.id}`, { image: iconNumber });
    };

    const handleLogoClick = () => navigate('/home');

    const languageDropdown = (
        <div className={styles.langContainer} ref={langRef}>
            <button className={styles.langBtn} onClick={() => setLangOpen(o => !o)}>
                {language.toUpperCase()}
                <span className={styles.langCaret}>▾</span>
            </button>
            {langOpen && (
                <div className={styles.floatingMenu}>
                    {SUPPORTED_LANGUAGES.map(lang => (
                        <button
                            key={lang}
                            className={`${styles.floatingMenuItem}${lang === language ? ` ${styles.floatingMenuItemActive}` : ''}`}
                            onClick={() => { setLanguage(lang); setLangOpen(false); }}
                        >
                            {lang.toUpperCase()}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    const profileContainer = (
        <div className={styles.profileContainer} ref={menuRef}>
            <span className={styles.profileName}>
                {format({ text: account?.name || 'anon', mode: 'UPPERCASE' }) + (isAnon ? ` (${t({ text: 'anon', language, mode: 'UPPERCASE' })})` : '')}
            </span>
            <div className={styles.profileImageWrapper} onClick={() => setMenuOpen(o => !o)}>
                <img
                    loading="eager"
                    className={styles.profileImage}
                    src={image}
                    alt={format({ text: account?.name || 'anon', mode: 'UPPERCASE' })}
                />
            </div>
            {menuOpen && (
                <div className={styles.floatingMenu}>
                    {!isAnon && (
                        <>
                            <div className={styles.iconPickerRow}>
                                {PROFILE_ICONS.map((src, i) => (
                                    <button
                                        key={i}
                                        className={`${styles.iconPickerBtn}${account?.image === i + 1 ? ` ${styles.iconPickerBtnActive}` : ''}`}
                                        onClick={() => handleIconSelect(i + 1)}
                                    >
                                        <img loading="eager" src={src} alt={`icon ${i + 1}`} />
                                    </button>
                                ))}
                            </div>
                            <div className={styles.floatingMenuDivider} />
                        </>
                    )}
                    <button className={styles.floatingMenuItem} onClick={handleDisconnect}>
                        {t({ text: 'disconnect', language, mode: 'UPPERCASE' })}
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <header className={styles.header}>
            <div className={styles.logo}>
                <img loading="eager" src={LOGO_NAME_SOURCE} alt="Liri" onClick={handleLogoClick} />
            </div>
            <div className={styles.rightSection}>
                {account?.role && profileContainer}
                {languageDropdown}
            </div>
        </header>
    );

};


export default Header;