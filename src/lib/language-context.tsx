import React, { createContext, useContext, useState, useEffect } from 'react';
import { MESSAGES, TranslationKey } from '../i18n';

// Backwards-compatible alias: the dictionary now lives in typed per-domain
// modules under src/i18n/ (STEP-26).
export const DICTIONARY = MESSAGES;
export type { TranslationKey };

export type Language = 'bn' | 'en';


interface LanguageContextType {
  language: Language;
  isBn: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const STORAGE_KEY = 'wealthfolio_language_v1';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'bn' || saved === 'en') {
        return saved;
      }
    }
    // Default to English ('en') as standard interface, with 1-click Bengali ('bn') switch
    return 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, language);
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'bn' ? 'en' : 'bn'));
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const entry = DICTIONARY[key];
    if (entry) {
      return entry[language] || fallback || entry.en;
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        isBn: language === 'bn',
        setLanguage,
        toggleLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
