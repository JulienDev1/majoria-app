import React from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../translations/translations';
import { playCyberSound } from '../utils/security';

interface LanguageSelectorProps {
  variant?: 'header' | 'dropdown' | 'settings' | 'compact' | 'bottom-nav';
  className?: string;
  onLanguageChange?: (lang: Language) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'header',
  className = '',
  onLanguageChange,
}) => {
  const { language, setLanguage, t } = useLanguage();

  const handleSelect = (lang: Language) => {
    if (lang !== language) {
      playCyberSound('click');
      setLanguage(lang);
      if (onLanguageChange) {
        onLanguageChange(lang);
      }
    }
  };

  // Fixed bottom bar dedicated variant
  if (variant === 'bottom-nav') {
    return (
      <div 
        className={`flex items-center justify-center p-1 rounded-xl bg-white/[0.06] backdrop-blur-xl border-[0.5px] border-white/20 shadow-md ${className}`}
        title={t('header.languageSelect')}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSelect('fr')}
            className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider transition-all cursor-pointer select-none ${
              language === 'fr'
                ? 'bg-sky-500/40 text-white border-[0.5px] border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FR
          </button>

          <span className="text-white/20 text-xs font-light select-none">|</span>

          <button
            type="button"
            onClick={() => handleSelect('en')}
            className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider transition-all cursor-pointer select-none ${
              language === 'en'
                ? 'bg-sky-500/40 text-white border-[0.5px] border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            EN
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'settings') {
    return (
      <div className={`grid grid-cols-2 gap-3 ${className}`}>
        <button
          type="button"
          onClick={() => handleSelect('fr')}
          className={`flex items-center justify-between p-3.5 rounded-xl border-[0.5px] transition-all cursor-pointer backdrop-blur-xl ${
            language === 'fr'
              ? 'bg-sky-500/20 border-sky-400/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]'
              : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🇫🇷</span>
            <div className="text-left">
              <div className="text-sm font-bold tracking-wide">Français</div>
              <div className="text-[11px] text-slate-400">France / International</div>
            </div>
          </div>
          {language === 'fr' && <Check className="w-4 h-4 text-sky-400" />}
        </button>

        <button
          type="button"
          onClick={() => handleSelect('en')}
          className={`flex items-center justify-between p-3.5 rounded-xl border-[0.5px] transition-all cursor-pointer backdrop-blur-xl ${
            language === 'en'
              ? 'bg-sky-500/20 border-sky-400/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]'
              : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🇬🇧</span>
            <div className="text-left">
              <div className="text-sm font-bold tracking-wide">English</div>
              <div className="text-[11px] text-slate-400">United States / Global</div>
            </div>
          </div>
          {language === 'en' && <Check className="w-4 h-4 text-sky-400" />}
        </button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => handleSelect(language === 'fr' ? 'en' : 'fr')}
        title={t('header.languageSelect')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border-[0.5px] border-white/20 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer backdrop-blur-xl ${className}`}
      >
        <Globe className="w-3.5 h-3.5 text-sky-400" />
        <span className="uppercase tracking-wider">{language}</span>
      </button>
    );
  }

  // Segmented Selector (FR | EN)
  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-xl bg-white/[0.05] backdrop-blur-xl border-[0.5px] border-white/20 shadow-inner ${className}`}
      title={t('header.languageSelect')}
    >
      <button
        type="button"
        onClick={() => handleSelect('fr')}
        className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wider transition-all cursor-pointer select-none ${
          language === 'fr'
            ? 'bg-sky-500/30 text-white border-[0.5px] border-sky-400/50 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        FR
      </button>

      <span className="text-white/20 text-xs font-light select-none px-0.5">|</span>

      <button
        type="button"
        onClick={() => handleSelect('en')}
        className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wider transition-all cursor-pointer select-none ${
          language === 'en'
            ? 'bg-sky-500/30 text-white border-[0.5px] border-sky-400/50 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        EN
      </button>
    </div>
  );
};
