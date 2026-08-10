// frontend/src/components/HomePageButtons/CodexButton.tsx


import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';
import { useNavigate } from 'react-router-dom';

import styles from '../HomePage.module.css';


const CodexButton: React.FC = () => {

    const { language } = useLanguage();
    const navigate = useNavigate();
    
    const handleClick = () => {
        navigate('/codex');
    };

    return (
        <button className={styles.smallButton} onClick={handleClick}>
            {t({ text: 'codex', language, mode: 'UPPERCASE' })}
        </button>
    );

};

export default CodexButton;