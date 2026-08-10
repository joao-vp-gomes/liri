// frontend/src/contexts/LanguageContext.tsx


import { createContext, useContext, useEffect, useState } from 'react';


export const SUPPORTED_LANGUAGES = [
    'en', 
    'pt'
] as const;
export type Language = typeof SUPPORTED_LANGUAGES[number];

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'pt',
    setLanguage: () => {}
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {

    const [language, setLanguage] = useState<Language>(localStorage.getItem('language') as Language ?? 'pt');

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
    
};


export const useLanguage = () => useContext(LanguageContext);