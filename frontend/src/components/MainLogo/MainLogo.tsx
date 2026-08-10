// frontend/src/components/MainLogo/MainLogo.tsx


import LOGO_FULL_SOURCE from '../../assets/logo-full.png';
import styles from './MainLogo.module.css';
const MainLogo: React.FC = () => {
    return (
        <>
            <div className={styles.logoFull}>
                <img loading="eager" src={LOGO_FULL_SOURCE} alt="Liri" />
            </div>
        </>
    );
}


export default MainLogo;