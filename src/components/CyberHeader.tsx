import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Volume2, 
  VolumeX, 
  Search, 
  Settings, 
  User,
  Flame,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ChevronUp,
  Maximize2
} from 'lucide-react';
import { playCyberSound } from '../utils/security';
import { UserProfile } from '../types';
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
  onQuickSearch: (query: string) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  isCollapsed?: boolean;
  onToggleCollapseHeader?: () => void;
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
  onQuickSearch,
  onToggleSidebar,
  isSidebarOpen = true,
  isCollapsed = false,
  onToggleCollapseHeader,
}) => {
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      playCyberSound('beep');
      onQuickSearch(searchQuery.trim());
      setSearchQuery('');
    }
  };

  const effectiveEnergy = typeof energyPercent === 'number' ? Math.max(0, energyPercent) : 100;

  const displayName = userProfile?.prenom 
    ? `${userProfile.prenom}${userProfile.nom ? ` ${userProfile.nom}` : ''}`
    : user?.nom || t('header.login');

  return (
    <header 
      className={`sticky top-0 z-30 border-b border-white/10 bg-[#030914]/90 backdrop-blur-xl px-3 sm:px-5 transition-all duration-300 ease-in-out shrink-0 ${
        isCollapsed 
          ? '-translate-y-full max-h-0 py-0 border-b-0 opacity-0 overflow-hidden pointer-events-none' 
          : 'translate-y-0 max-h-28 py-2.5 sm:py-3 opacity-100 shadow-lg'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Left Side: Sidebar Toggle + Pure Brand Typography (No Icon Logo) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Toggle Sidebar Button */}
          {onToggleSidebar && (
            <button
              onClick={() => {
                playCyberSound('click');
                onToggleSidebar();
              }}
              title={isSidebarOpen ? "Replier le menu (Agrandir l'espace)" : "Dérouler le menu vers la droite"}
              className={`flex items-center gap-1.5 p-2 rounded-xl border-[0.5px] transition-all text-xs font-semibold active:scale-95 cursor-pointer ${
                isSidebarOpen
                  ? 'bg-white/[0.08] border-white/20 text-slate-200 hover:bg-white/[0.15] hover:text-white'
                  : 'bg-sky-600/30 border-sky-400/50 text-sky-200 hover:bg-sky-600/40 shadow-sm'
              }`}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-5 h-5 text-slate-300" />
              ) : (
                <>
                  <PanelLeftOpen className="w-5 h-5 text-sky-300" />
                  <span className="hidden sm:inline font-medium text-xs text-sky-200">Dérouler</span>
                  <ChevronRight className="w-3.5 h-3.5 text-sky-300 hidden sm:inline" />
                </>
              )}
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg sm:text-xl md:text-2xl text-white tracking-tight">
                {t('header.appName')}
              </span>
              <span className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.1] text-white border-[0.5px] border-white/20">
                {t('header.assistantBadge')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium leading-none mt-0.5">
              <span className="hidden sm:flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>{t('header.online')}</span>
              </span>
              <span className="hidden sm:inline text-slate-500">|</span>
              <span className="text-white font-mono text-xs sm:text-sm">{cyberClock}</span>
            </div>
          </div>
        </div>

        {/* Center: Global Instant Search Bar (Glassmorphic) */}
        <form 
          onSubmit={handleSearchSubmit} 
          className="hidden md:flex relative flex-1 max-w-xs lg:max-w-md items-center group mx-2"
        >
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-white transition-colors" />
          <input
            type="text"
            placeholder={t('header.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 lg:h-11 bg-white/[0.06] border-[0.5px] border-white/20 focus:border-white/50 rounded-xl pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all font-sans"
          />
        </form>

        {/* Right Side: Language + Forfaits + Controls + Collapse Header */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* FR / EN Language Selector */}
          <div className="hidden sm:block">
            <LanguageSelector variant="header" />
          </div>

          {/* Bouton Forfaits / Abonnements */}
          {onOpenForfaits && (
            <button
              onClick={() => {
                playCyberSound('click');
                onOpenForfaits();
              }}
              title={t('header.plansTitle')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border-[0.5px] border-red-400/50 bg-gradient-to-r from-red-600/90 via-rose-600/90 to-red-600/90 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Flame className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">{t('header.plansBtn')}</span>
            </button>
          )}

          {/* Confidential Mode */}
          <button
            onClick={() => {
              playCyberSound('click');
              onToggleConfidential();
            }}
            title={confidentialMode ? t('header.confidentialActive') : t('header.confidentialInactive')}
            className={`p-2 rounded-xl border-[0.5px] transition-all text-xs flex items-center gap-1.5 active:scale-95 cursor-pointer ${
              confidentialMode
                ? 'bg-rose-950/80 border-rose-400/50 text-rose-300 shadow-sm'
                : 'bg-white/[0.06] border-white/15 text-slate-300 hover:text-white hover:bg-white/[0.12]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="hidden xl:inline font-medium">
              {confidentialMode ? t('header.confidentialBadge') : t('header.confidentialOff')}
            </span>
          </button>

          {/* Voice Auto Speak */}
          <button
            onClick={() => {
              playCyberSound('click');
              onToggleVoiceAuto();
            }}
            title={voiceAutoSpeak ? t('header.voiceAutoActive') : t('header.voiceAutoInactive')}
            className={`p-2 rounded-xl border-[0.5px] transition-all text-xs flex items-center gap-1.5 active:scale-95 cursor-pointer ${
              voiceAutoSpeak
                ? 'bg-cyan-950/80 border-cyan-400/50 text-cyan-300 shadow-sm'
                : 'bg-white/[0.06] border-white/15 text-slate-300 hover:text-white hover:bg-white/[0.12]'
            }`}
          >
            {voiceAutoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden xl:inline font-medium">
              {voiceAutoSpeak ? t('header.voiceBadge') : t('header.voiceOff')}
            </span>
          </button>

          {/* User Account Button */}
          <button
            onClick={() => {
              playCyberSound('click');
              onOpenAuth();
            }}
            title={t('header.userAccount')}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border-[0.5px] border-white/20 text-white transition-all text-xs font-semibold cursor-pointer"
          >
            <User className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline max-w-[100px] truncate">{displayName}</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              playCyberSound('click');
              onOpenSettings();
            }}
            title={t('header.settings')}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border-[0.5px] border-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Collapse Header Button -> Only Chat View */}
          {onToggleCollapseHeader && (
            <button
              onClick={() => {
                playCyberSound('click');
                onToggleCollapseHeader();
              }}
              title="Replier l'en-tête (Ne voir que le chat)"
              className="flex items-center gap-1 p-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border-[0.5px] border-white/20 text-slate-200 hover:text-white transition-all text-xs cursor-pointer active:scale-95"
            >
              <ChevronUp className="w-4 h-4 text-sky-300" />
              <span className="hidden lg:inline text-[11px] font-medium">Plein écran</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
