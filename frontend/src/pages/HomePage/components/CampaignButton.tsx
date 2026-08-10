// frontend/src/components/HomePageButtons/CampaignButton.tsx


import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { t } from '../../../utils/localizer';

import styles from '../HomePage.module.css';


const CampaignButton: React.FC = () => {

    const { language } = useLanguage();

    const doNothing = () => {}
    const handleClick = () => {
        doNothing();
    };

    return (
        <button className={styles.smallButton} onClick={handleClick}>
            {t({ text: 'campaign', language, mode: 'UPPERCASE' })}
        </button>
    );

};


export default CampaignButton;