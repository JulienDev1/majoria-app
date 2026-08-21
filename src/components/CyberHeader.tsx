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
  BatteryCharging,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  BatteryFull
} from 'lucide-react';
import { playCyberSound } from '../utils/security';
import { CyberBrainHead } from './CyberBrainHead';
import { UserProfile } from '../types';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [cyberClock, setCyberClock] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCyberClock(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      playCyberSound('beep');
      onQuickSearch(searchQuery.trim());
      setSearchQuery('');
      setIsMobileSearchOpen(false);
    }
  };

  const effectiveEnergy = typeof energyPercent === 'number' ? Math.max(0, Math.min(100, energyPercent)) : 80;

  const renderBatteryIcon = () => {
    if (effectiveEnergy <= 10) return <BatteryWarning className="w-4 h-4 text-rose-400 animate-pulse" />;
    if (effectiveEnergy <= 30) return <BatteryLow className="w-4 h-4 text-amber-400" />;
    if (effectiveEnergy <= 70) return <BatteryMedium className="w-4 h-4 text-emerald-400" />;
    return <BatteryFull className="w-4 h-4 text-emerald-400" />;
  };

  const displayName = userProfile?.prenom 
    ? `${userProfile.prenom}${userProfile.nom ? ` ${userProfile.nom}` : ''}`
    : user?.nom || 'Connexion';

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#030914]/45 backdrop-blur-2xl px-3 sm:px-5 py-2.5 sm:py-3 shadow-lg shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Left Side: Brand Logo with Sparkle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-2xl bg-white/[0.04] backdrop-blur-xl border-[0.5px] border-white/20 shadow-md group">
              <CyberBrainHead size={28} className="group-hover:scale-105 transition-transform" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-[0.5px] border-white/60 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg sm:text-xl md:text-2xl text-white tracking-tight">
                  MajorI.A
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.08] backdrop-blur-md text-white border-[0.5px] border-white/20">
                  Assistant
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium leading-none mt-0.5">
                <span className="hidden sm:flex items-center gap-1 text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span>En ligne</span>
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
            placeholder="Rechercher (favoris, mémoires, tâches...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 lg:h-11 bg-white/[0.04] backdrop-blur-xl border-[0.5px] border-white/20 focus:border-white/50 rounded-xl pl-10 pr-16 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all font-sans"
          />
          <button
            type="submit"
            className="absolute right-1 px-2.5 py-1 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-[0.5px] border-white/20 rounded-lg transition-all"
          >
            Entrée
          </button>
        </form>

        {/* Right Side: Quick Action Controls (Transparent / Glassmorphic) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => {
              playCyberSound('click');
              setIsMobileSearchOpen(!isMobileSearchOpen);
            }}
            title="Rechercher"
            className="md:hidden p-2 rounded-xl bg-white/[0.05] backdrop-blur-xl border-[0.5px] border-white/15 text-white active:scale-95 flex items-center justify-center"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          {/* Mobile Bridge / Phone Connector Button */}
          {onOpenMobileBridge && (
            <button
              onClick={() => {
                playCyberSound('click');
                onOpenMobileBridge();
              }}
              title="Pont Mobile & Compagnon Téléphone"
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-xl border-[0.5px] border-white/20 text-sky-300 text-xs sm:text-sm font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span className="hidden xl:inline">Pont Mobile</span>
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
            title={confidentialMode ? "Mode confidentiel actif" : "Activer le mode confidentiel"}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold border-[0.5px] transition-all flex items-center gap-1.5 active:scale-95 backdrop-blur-xl ${
              confidentialMode
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                : 'bg-white/[0.05] border-white/15 text-slate-200 hover:bg-white/[0.1]'
            }`}
          >
            {confidentialMode ? <ShieldAlert className="w-4 h-4 text-amber-300" /> : <Shield className="w-4 h-4 text-slate-300" />}
            <span className="hidden md:inline">{confidentialMode ? 'Confidentiel' : 'Standard'}</span>
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
            title={voiceAutoSpeak ? "Lecture vocale active" : "Lecture vocale désactivée"}
            className={`p-2 sm:p-2.5 rounded-xl border-[0.5px] text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center backdrop-blur-xl ${
              voiceAutoSpeak
                ? 'bg-sky-500/20 border-sky-400/40 text-white'
                : 'bg-white/[0.05] border-white/15 text-slate-300 hover:bg-white/[0.1]'
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
            title="Paramètres d'apparence, Voix, Profil & Notifications"
            className="p-2 sm:p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-xl border-[0.5px] border-white/15 text-white transition-all active:scale-95 flex items-center justify-center cursor-pointer"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Battery / Energy Consumption Live Gauge (Replaces Credits) */}
          <button
            onClick={() => {
              playCyberSound('click');
              if (onOpenForfaits) onOpenForfaits();
            }}
            title={`Consommation restante : ${effectiveEnergy}% restant ${rolloverPercent > 0 ? `(+${rolloverPercent}% reporté du mois précédent)` : ''}`}
            className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl border-[0.5px] text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer backdrop-blur-xl ${
              effectiveEnergy <= 0
                ? 'bg-rose-950/40 border-rose-400/40 text-rose-200 animate-pulse'
                : effectiveEnergy <= 25
                ? 'bg-amber-950/40 border-amber-400/40 text-amber-200'
                : 'bg-emerald-950/40 border-emerald-400/40 text-emerald-200'
            }`}
          >
            {renderBatteryIcon()}
            <div className="flex items-center gap-1">
              <span className="font-mono font-extrabold">{effectiveEnergy}%</span>
              <span className="hidden sm:inline text-xs font-medium text-slate-300">restant</span>
            </div>
          </button>

          {/* Forfaits Button Header */}
          {onOpenForfaits && (
            <button
              onClick={() => {
                playCyberSound('click');
                onOpenForfaits();
              }}
              title="Consulter les Forfaits & Tarifs avec Report Mensuel Inclus"
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-red-600/80 via-rose-600/80 to-red-600/80 hover:from-red-500 hover:to-rose-500 backdrop-blur-xl border-[0.5px] border-red-300/40 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Flame className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
              <span className="hidden sm:inline">Forfaits</span>
            </button>
          )}

          {/* User Auth Profile Badge */}
          <button
            onClick={() => {
              playCyberSound('click');
              onOpenAuth();
            }}
            title="Gestion du compte et profil"
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] backdrop-blur-xl border-[0.5px] border-white/15 text-white text-xs sm:text-sm font-semibold transition-all active:scale-95"
          >
            <User className="w-4 h-4 text-white" />
            <span className="hidden lg:inline">{displayName}</span>
          </button>
        </div>
      </div>

      {/* Mobile Expandable Search Bar */}
      {isMobileSearchOpen && (
        <div className="md:hidden mt-2 pt-2 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Rechercher mémoires, favoris, tâches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.06] backdrop-blur-xl border-[0.5px] border-white/20 rounded-xl pl-8 pr-16 py-2 text-xs text-white placeholder-slate-400 font-sans focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <button
              type="submit"
              className="absolute right-1 px-2.5 py-1 text-xs font-semibold bg-white/10 text-white rounded-lg"
            >
              OK
            </button>
          </form>
        </div>
      )}
    </header>
  );
};
