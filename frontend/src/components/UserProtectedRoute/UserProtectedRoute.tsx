// frontend/src/components/UserProtectedRoute/UserProtectedRoute.tsx


import { useAuth } from '../../contexts/AuthContext';
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

import styles from './UserProtectedRoute.module.css';
import { t } from '../../utils/localizer';


export const UserProtectedRoute = ({ children, validation, returnHome=true }: {
    children: JSX.Element,
    validation: boolean,
    returnHome: boolean
}) => {

    const { language } = useLanguage();
    const { loading } = useAuth();
    const navigate = useNavigate();

    if (loading) return null;
    
    const returnHomeButton = (
        <>
            <button onClick={() => navigate('/home')}>
                {t({ text: 'back-home', language: language, mode: 'UPPERCASE' })}
            </button>
        </>
    );

    if (!validation) return (
        <>
            <div className={styles.protection}>
                    <p>{t({ text: 'user-protection-breach-message', language: language, mode: 'UPPERCASE' })}</p>
                    {returnHome? returnHomeButton : null}
            </div>
        </>
    );
        
    else return children;

};


export default UserProtectedRoute;