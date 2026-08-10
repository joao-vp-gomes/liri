// frontend/src/components/HomePageButtons/RulesButton.tsx


import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';

import styles from '../HomePage.module.css';


const RulesButton: React.FC = () => {

    const { language } = useLanguage();

    const doNothing = () => {}
    const handleClick = () => {
        doNothing();
    };

    return (
        <button className={styles.smallButton} onClick={handleClick}>
            {t({ text: 'rules', language, mode: 'UPPERCASE' })}
        </button>
    );

};

export default RulesButton;