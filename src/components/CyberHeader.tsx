import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Search, 
  Settings, 
  User,
  Smartphone,
  Flame,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  BatteryFull
} from 'lucide-react';
import { playCyberSound } from '../utils/security';
import { CyberBrainHead } from './CyberBrainHead';
import { UserProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CyberHeaderProps {
  confidentialMode: boolean;
  setConfidentialMode?: (val: boolean) => void;
  onToggleConfidential?: () => void;
  voiceAutoSpeak: boolean;
  setVoiceAutoSpeak?: (val: boolean) => void;
  onToggleVoiceAuto?: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenForfaits?: () => void;
  onOpenMobileBridge?: () => void;
  user: { nom: string } | null;
  userProfile?: UserProfile;
  energyPercent?: number | null;
  rolloverPercent?: number;
  onQuickSearch: (query: string) => void;
  onSummarizeDay?: () => void;
  tasksCount?: number;
  remindersCount?: number;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const CyberHeader: React.FC<CyberHeaderProps> = ({
  confidentialMode,
  setConfidentialMode,
  onToggleConfidential,
  voiceAutoSpeak,
  setVoiceAutoSpeak,
  onToggleVoiceAuto,
  onOpenSettings,
  onOpenAuth,
  onOpenForfaits,
  onOpenMobileBridge,
  user,
  userProfile,
  energyPercent = 80,
  rolloverPercent = 0,
  onQuickSearch,
}) => {
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [cyberClock, setCyberClock] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCyberClock(now.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
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

  const renderBatteryIcon = () => {
    if (effectiveEnergy <= 10) return <BatteryWarning className="w-4 h-4 text-rose-400 animate-pulse" />;
    if (effectiveEnergy <= 30) return <BatteryLow className="w-4 h-4 text-amber-400" />;
    if (effectiveEnergy <= 70) return <BatteryMedium className="w-4 h-4 text-emerald-400" />;
    return <BatteryFull className="w-4 h-4 text-emerald-400" />;
  };

  const displayName = userProfile?.prenom 
    ? `${userProfile.prenom}${userProfile.nom ? ` ${userProfile.nom}` : ''}`
    : user?.nom || t('header.login');

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#030914]/65 px-3 sm:px-5 py-2.5 sm:py-3 shadow-lg shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Left Side: Brand Logo with Sparkle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-2xl bg-white/[0.06] border-[0.5px] border-white/20 shadow-md group">
              <CyberBrainHead size={28} className="group-hover:scale-105 transition-transform" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-[0.5px] border-white/60 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>

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
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span>{t('header.online')}</span>
                </span>
                <span className="hidden sm:inline text-slate-500">|</span>
                <span className="text-white font-mono text-xs sm:text-sm">{cyberClock}</span>
              </div>
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

        {/* Right Side: Quick Action Controls (Transparent / Glassmorphic) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Bridge / Phone Connector Button */}
          {onOpenMobileBridge && (
            <button
              onClick={() => {
                playCyberSound('click');
                onOpenMobileBridge();
              }}
              title={t('header.mobileBridgeTitle')}
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border-[0.5px] border-white/20 text-sky-300 text-xs sm:text-sm font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span className="hidden xl:inline">{t('header.mobileBridgeBtn')}</span>
            </button>
          )}

          {/* Confidential Mode Toggle */}
          <button
            onClick={() => {
              playCyberSound('beep');
              if (onToggleConfidential) {
                onToggleConfidential();
              } else if (setConfidentialMode) {
                setConfidentialMode(!confidentialMode);
              }
            }}
            title={confidentialMode ? t('header.confidentialTitleActive') : t('header.confidentialTitleInactive')}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold border-[0.5px] transition-all flex items-center gap-1.5 active:scale-95 ${
              confidentialMode
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                : 'bg-white/[0.07] border-white/15 text-slate-200 hover:bg-white/[0.12]'
            }`}
          >
            {confidentialMode ? <ShieldAlert className="w-4 h-4 text-amber-300" /> : <Shield className="w-4 h-4 text-slate-300" />}
            <span className="hidden md:inline">{confidentialMode ? t('header.confidentialActive') : t('header.confidentialStandard')}</span>
          </button>

          {/* Voice Auto-Speak Toggle */}
          <button
            onClick={() => {
              playCyberSound('click');
              if (onToggleVoiceAuto) {
                onToggleVoiceAuto();
              } else if (setVoiceAutoSpeak) {
                setVoiceAutoSpeak(!voiceAutoSpeak);
              }
            }}
            title={voiceAutoSpeak ? t('header.voiceTitleActive') : t('header.voiceTitleInactive')}
            className={`p-2 sm:p-2.5 rounded-xl border-[0.5px] text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center ${
              voiceAutoSpeak
                ? 'bg-sky-500/20 border-sky-400/40 text-white'
                : 'bg-white/[0.07] border-white/15 text-slate-300 hover:bg-white/[0.12]'
            }`}
          >
            {voiceAutoSpeak ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-sky-300" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />}
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => {
              playCyberSound('click');
              onOpenSettings();
            }}
            title={t('header.settingsTitle')}
            className="p-2 sm:p-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border-[0.5px] border-white/15 text-white transition-all active:scale-95 flex items-center justify-center cursor-pointer"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Battery / Energy Consumption Live Gauge */}
          <button
            onClick={() => {
              playCyberSound('click');
              if (onOpenForfaits) onOpenForfaits();
            }}
            title={`${t('header.batteryTitle')} : ${effectiveEnergy}% ${t('header.remaining')} ${rolloverPercent > 0 ? `(+${rolloverPercent}% ${language === 'fr' ? 'reporté' : 'rolled over'})` : ''}`}
            className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl border-[0.5px] text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer ${
              effectiveEnergy <= 0
                ? 'bg-rose-950/60 border-rose-400/40 text-rose-200 animate-pulse'
                : effectiveEnergy <= 25
                ? 'bg-amber-950/60 border-amber-400/40 text-amber-200'
                : 'bg-emerald-950/60 border-emerald-400/40 text-emerald-200'
            }`}
          >
            {renderBatteryIcon()}
            <div className="flex items-center gap-1">
              <span className="font-mono font-extrabold">{effectiveEnergy}%</span>
              <span className="hidden sm:inline text-xs font-medium text-slate-300">{t('header.remaining')}</span>
            </div>
          </button>

          {/* Forfaits Button Header */}
          {onOpenForfaits && (
            <button
              onClick={() => {
                playCyberSound('click');
                onOpenForfaits();
              }}
              title={t('header.plansTitle')}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-red-600/90 via-rose-600/90 to-red-600/90 hover:from-red-500 hover:to-rose-500 border-[0.5px] border-red-300/40 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Flame className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
              <span className="hidden sm:inline">{t('header.plansBtn')}</span>
            </button>
          )}

          {/* User Auth Profile Badge */}
          <button
            onClick={() => {
              playCyberSound('click');
              onOpenAuth();
            }}
            title={t('header.userTitle')}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border-[0.5px] border-white/15 text-white text-xs sm:text-sm font-semibold transition-all active:scale-95"
          >
            <User className="w-4 h-4 text-white" />
            <span className="hidden lg:inline">{displayName}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
