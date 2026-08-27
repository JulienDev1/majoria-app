import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Volume2, 
  VolumeX, 
  Settings, 
  User,
  Flame,
  ChevronRight,
  ChevronUp,
  Maximize2,
  Sun,
  Moon
} from 'lucide-react';
import { playCyberSound } from '../utils/security';
import { UserProfile, ThemeMode } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

interface CyberHeaderProps {
  user: any;
  userProfile?: UserProfile | null;
  confidentialMode: boolean;
  onToggleConfidential: () => void;
  voiceAutoSpeak: boolean;
  onToggleVoiceAuto: () => void;
  energyPercent?: number;
  rolloverPercent?: number;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenForfaits?: () => void;
  onQuickSearch?: (query: string) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  isCollapsed?: boolean;
  onToggleCollapseHeader?: () => void;
  themeMode?: ThemeMode;
  resolvedTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  isOnline?: boolean;
}

export const CyberHeader: React.FC<CyberHeaderProps> = ({
  user,
  userProfile,
  confidentialMode,
  onToggleConfidential,
  voiceAutoSpeak,
  onToggleVoiceAuto,
  onOpenSettings,
  onOpenAuth,
  onOpenForfaits,
  energyPercent = 80,
  rolloverPercent = 0,
  isCollapsed = false,
  onToggleCollapseHeader,
  themeMode = 'system',
  resolvedTheme = 'light',
  onToggleTheme,
  isOnline = true,
}) => {
  const { language, t } = useLanguage();
  const [cyberClock, setCyberClock] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const locale = language === 'en' ? 'en-US' : 'fr-FR';
      setCyberClock(now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  const displayName = userProfile?.prenom 
    ? `${userProfile.prenom}${userProfile.nom ? ` ${userProfile.nom}` : ''}`
    : user?.nom || t('header.login');

  return (
    <header 
      className={`sticky top-0 z-30 border-b border-[var(--fb-border)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] px-3 sm:px-4 transition-all duration-300 ease-in-out shrink-0 ${
        isCollapsed 
          ? '-translate-y-full max-h-0 py-0 border-b-0 opacity-0 overflow-hidden pointer-events-none' 
          : 'translate-y-0 max-h-20 py-1.5 opacity-100 shadow-sm'
      }`}
    >
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-2 sm:gap-4 h-12">
        {/* Left Side: Logo maskable_icon.png */}
        <div className="flex items-center gap-3 shrink-0">
          <img 
            src="/maskable_icon.png" 
            alt="Major2I.A Logo" 
            className="w-10 h-10 rounded-full object-cover shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
            title="Major2I.A"
          />
        </div>

        {/* Center: Status & Live Time Badge */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--fb-surface-secondary)] text-xs font-semibold text-[var(--fb-text-secondary)]">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-[var(--fb-green)]">
                <span className="w-2 h-2 rounded-full bg-[var(--fb-green)] animate-pulse inline-block" />
                <span>{t('header.online')}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span>{language === 'en' ? 'Offline (Local Engine)' : 'Hors-ligne (Moteur Local)'}</span>
              </span>
            )}
            <span className="text-[var(--fb-border)]">|</span>
            <span className="font-mono text-[var(--fb-text-primary)]">{cyberClock}</span>
          </div>
        </div>

        {/* Right Side: Action Icons + Profile in pure Facebook Style */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* FR / EN Language Selector */}
          <div className="hidden sm:block">
            <LanguageSelector variant="compact" className="bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] border-[var(--fb-border)]" />
          </div>

          {/* Bouton Forfaits / Abonnements */}
          {onOpenForfaits && (
            <button
              onClick={() => {
                playCyberSound('click');
                onOpenForfaits();
              }}
              title={t('header.plansTitle')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] text-white font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Flame className="w-4 h-4 text-white" />
              <span className="hidden md:inline">{t('header.plansBtn')}</span>
            </button>
          )}

          {/* Sun / Moon Quick Theme Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={() => {
                onToggleTheme();
              }}
              title={resolvedTheme === 'dark' ? 'Passer en Mode Clair (Light)' : 'Passer en Mode Sombre (Dark)'}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-amber-400" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-indigo-600" />
              )}
            </button>
          )}

          {/* Confidential Mode */}
          <button
            onClick={() => {
              playCyberSound('click');
              onToggleConfidential();
            }}
            title={confidentialMode ? t('header.confidentialActive') : t('header.confidentialInactive')}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              confidentialMode
                ? 'bg-[#fa383e]/15 text-[#fa383e]'
                : 'bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)]'
            }`}
          >
            <Shield className="w-4.5 h-4.5" />
          </button>

          {/* Voice Auto Speak */}
          <button
            onClick={() => {
              playCyberSound('click');
              onToggleVoiceAuto();
            }}
            title={voiceAutoSpeak ? t('header.voiceAutoActive') : t('header.voiceAutoInactive')}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              voiceAutoSpeak
                ? 'bg-[var(--fb-blue-light)] text-[var(--fb-blue)]'
                : 'bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)]'
            }`}
          >
            {voiceAutoSpeak ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
          </button>

          {/* User Account Button */}
          <button
            onClick={() => {
              playCyberSound('click');
              onOpenAuth();
            }}
            title={t('header.userAccount')}
            className="flex items-center gap-2 p-1 sm:px-2 rounded-full hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] transition-all cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[var(--fb-blue)] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {userProfile?.prenom ? userProfile.prenom[0].toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <span className="hidden xl:inline text-xs font-semibold max-w-[120px] truncate">{displayName}</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              playCyberSound('click');
              onOpenSettings();
            }}
            title={t('header.settings')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] flex items-center justify-center transition-all cursor-pointer"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>

          {/* Collapse Header Button -> Fullscreen View */}
          {onToggleCollapseHeader && (
            <button
              onClick={() => {
                playCyberSound('click');
                onToggleCollapseHeader();
              }}
              title="Plein écran (Masquer l'en-tête)"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)] flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              <ChevronUp className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
