import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, translations, TranslationsSchema } from '../translations/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (path: string, fallbackOrParams?: string | Record<string, any>, params?: Record<string, any>) => string;
  trans: TranslationsSchema;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Mapping of common key variations to standard keys for maximum resilience
const KEY_ALIASES: Record<string, string> = {
  'chat.welcome': 'chat.welcome',
  'chat.welcomeDesc': 'chat.welcomeDesc',
  'chat.inputPlaceholder': 'chat.inputPlaceholder',
  'chat.mic': 'chat.mic',
  'chat.clearConv': 'chat.clearConv',
  'chat.batteryExhausted': 'chat.batteryExhausted',
  'chat.recharge': 'chat.recharge',
  'chat.photoVideo': 'chat.photoVideo',
  'settings.languageTitle': 'settings.languageTitle',
  'settings.languageDesc': 'settings.languageDesc',
  'settings.identityTitle': 'settings.identityTitle',
  'settings.identityDesc': 'settings.identityDesc',
  'settings.voiceTitle': 'settings.voiceTitle',
  'settings.voiceDesc': 'settings.voiceDesc',
  'settings.alertTitle': 'settings.alertTitle',
  'settings.alertDesc': 'settings.alertDesc',
  'pricing.modalTitle': 'pricing.modalTitle',
  'pricing.modalDesc': 'pricing.modalDesc',
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Always initialize safely to 'fr' (French) by default
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('neo-app-language');
        if (saved === 'fr' || saved === 'en') {
          return saved;
        }
      }
    } catch {
      // Ignore storage errors
    }
    return 'fr';
  });

  const setLanguage = useCallback((lang: Language) => {
    const validLang: Language = lang === 'en' ? 'en' : 'fr';
    setLanguageState(validLang);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('neo-app-language', validLang);
        document.documentElement.lang = validLang;
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next: Language = prev === 'fr' ? 'en' : 'fr';
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('neo-app-language', next);
          document.documentElement.lang = next;
        }
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const trans = translations[language] || translations.fr;

  // Safe and ultra-resilient translation resolver
  const t = useCallback(
    (path: string, fallbackOrParams?: string | Record<string, any>, params?: Record<string, any>): string => {
      let fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : '';
      let replacements = typeof fallbackOrParams === 'object' ? fallbackOrParams : params;

      if (!path) return fallback || '';

      const searchPath = KEY_ALIASES[path] || path;
      const keys = searchPath.split('.');

      // 1. Look up in active language
      let currentResult: any = translations[language] || translations.fr;
      for (const key of keys) {
        if (currentResult && typeof currentResult === 'object' && key in currentResult) {
          currentResult = currentResult[key];
        } else {
          currentResult = undefined;
          break;
        }
      }

      // 2. If not found, try French dictionary as fallback
      if ((currentResult === undefined || currentResult === null) && language !== 'fr') {
        let frResult: any = translations.fr;
        for (const key of keys) {
          if (frResult && typeof frResult === 'object' && key in frResult) {
            frResult = frResult[key];
          } else {
            frResult = undefined;
            break;
          }
        }
        currentResult = frResult;
      }

      // 3. If STILL not found, check original path in French if alias was used
      if (currentResult === undefined && path !== searchPath) {
        let origResult: any = translations.fr;
        for (const key of path.split('.')) {
          if (origResult && typeof origResult === 'object' && key in origResult) {
            origResult = origResult[key];
          } else {
            origResult = undefined;
            break;
          }
        }
        currentResult = origResult;
      }

      // 4. Resolve final string
      let finalString = '';
      if (typeof currentResult === 'string' && currentResult.trim().length > 0) {
        finalString = currentResult;
      } else if (fallback && fallback.trim().length > 0) {
        finalString = fallback;
      } else {
        // Human-friendly cleanup so raw dot-keys NEVER appear in UI
        const lastPart = keys[keys.length - 1] || path;
        finalString = lastPart.replace(/([A-Z])/g, ' $1').trim();
        finalString = finalString.charAt(0).toUpperCase() + finalString.slice(1);
      }

      // 5. Interpolate placeholders {key}
      if (replacements && typeof replacements === 'object') {
        for (const [k, v] of Object.entries(replacements)) {
          finalString = finalString.replace(new RegExp(`{${k}}`, 'g'), String(v ?? ''));
        }
      }

      return finalString;
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        trans,
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
