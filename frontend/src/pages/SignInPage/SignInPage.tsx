// frontend/src/pages/SignInPage/SignInPage.tsx


import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../utils/localizer';
import { dbFetch } from '../../services/database'
import ALIASES from '../../data/aliases.json';
import MainLogo from '../../components/MainLogo/MainLogo';

import styles from './SignInPage.module.css';


const SignInPage: React.FC = () => {

    const navigate = useNavigate();
    const { language } = useLanguage();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<string | null>(null);

    const location = useLocation();
    const from = (location.state as { from?: string })?.from ?? '/home';

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading('user');
        try {

            const { data, error } = await supabase.auth.signInWithPassword({
                email: username + '@liri.com',
                password,
            });
            if (error || !data.user) { setError('invalid-credentials'); setLoading(null); return; }

            const userData = await dbFetch(`users/${data.user.id}/name`);
            if (!userData) {
                await supabase.auth.signOut();
                setError('invalid-credentials');
            } else navigate(from, { replace: true });
            
        } catch { setError('invalid-credentials'); }
        setLoading(null);
    };

    const handleAnon = async () => {
        setError(null);
        setLoading('anon');
        try {
            
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error || !data.user) { setError('anon-sign-in-error'); setLoading(null); return; }

            const alias = ALIASES.list[Math.floor(Math.random() * ALIASES.list.length)];
            const { error: insertError } = await supabase.from('users').insert({
                id: data.user.id,
                role: 'anon',
                name: alias,
                image: 0,
                characters: []
            });

            if (insertError) { setError('anon-sign-in-error'); setLoading(null); return; }

            navigate(from, { replace: true });

        } catch { setError('anon-sign-in-error'); }
        setLoading(null);
    };

    return (
        <>
            <div className={styles.page}>
                <div className={styles.center}>
                    
                    <MainLogo />

                    <form className={styles.form} onSubmit={handleSignIn}>

                        <div className={styles.field}>
                            <label className={styles.label}>
                                {t({text: 'username', language: language, mode: 'UPPERCASE'})}
                            </label>
                            <input
                                className={styles.input}
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>
                                {t({text: 'password', language: language, mode: 'UPPERCASE'})}
                            </label>
                            <input
                                className={styles.input}
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && <div className={styles.error}>{t({text: error, language: language, mode: 'PLAIN_FIRST_UPPER'})}</div>}

                        <div className={styles.buttons}>
                            <button className={styles.buttonPrimary} type="submit" disabled={!!loading}>
                                {loading === 'user'
                                    ? t({text: 'signing-in', language: language, mode: 'UPPERCASE'})
                                    : t({text: 'sign-in', language: language, mode: 'UPPERCASE'})
                                }
                            </button>
                            <button className={styles.buttonSecondary} type="button" onClick={handleAnon} disabled={!!loading}>
                                {loading === 'anon'
                                    ? t({text: 'entering-as-anon', language: language, mode: 'UPPERCASE'})
                                    : t({text: 'enter-as-anon', language: language, mode: 'UPPERCASE'})
                                }
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </>
    );

};


export default SignInPage;