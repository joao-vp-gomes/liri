// frontend/src/components/HomePageButtons/ModerationButton.tsx


import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';
import { useNavigate } from 'react-router-dom';

import styles from '../HomePage.module.css';


const ModerationButton: React.FC = () => {

    const { language } = useLanguage();
    const navigate = useNavigate();

    const handleClick = () => {
        navigate('/moderation')
    };

    return (
        <button className={styles.smallButton} onClick={handleClick}>
            {t({ text: 'moderation', language, mode: 'UPPERCASE' })}
        </button>
    );

};

export default ModerationButton;