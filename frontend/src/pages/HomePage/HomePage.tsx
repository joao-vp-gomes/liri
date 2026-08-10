// frontend/src/pages/HomePage/HomePage.tsx


import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import CampaignButton from './components/CampaignButton.tsx';
import CodexButton from './components/CodexButton.tsx';
import RulesButton from './components/RulesButton';
import ModerationButton from './components/ModerationButton';
import CharactersButton from './components/CharactersButton';

import LOGO_FULL_SOURCE from '../../assets/logo-full.png';

import styles from './HomePage.module.css';

const HomePage: React.FC = () => {

    const { account } = useAuth();

    let buttonsList;
    switch(account?.role) {
        case 'anon':
            buttonsList = (
                <>  
                    <CampaignButton />
                    <CodexButton />
                    <RulesButton />
                </>
            );
            break;
        case 'member':
            buttonsList = (
                <>
                    <CharactersButton />
                    <CampaignButton />
                    <CodexButton />
                    <RulesButton />
                </>
            );
            break;
        case 'admin':
            buttonsList = (
                <>  
                    <ModerationButton />
                    <CampaignButton />
                    <CodexButton />
                    <RulesButton />
                </>
            );
            break;
        default: break;
    }


    return (
        <>
            <div className={styles.page}>

                <div className={styles.center}>
                    <div className={styles.logoFull}>
                        <img loading="eager" src={LOGO_FULL_SOURCE} alt="Liri" />
                    </div>
                    {buttonsList}
                </div>

            </div>
        </>
    );

};
export default HomePage;