import React, { useRef, useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  Download, 
  Upload, 
  Trash2, 
  Palette, 
  Sparkles, 
  Image as ImageIcon,
  Database,
  Battery,
  BatteryCharging,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Volume2,
  Bell,
  Smartphone,
  Calendar,
  Layers,
  ArrowRight,
  Globe
} from 'lucide-react';
import { playCyberSound, playAlertSound, speakCyberResponse } from '../utils/security';
import { GalaxyColorScheme } from './MilkyWayGalaxy';
import { getSupabaseConfig, saveSupabaseConfig, callUseCredit } from '../utils/supabase';
import { AlertSound, RolloverEnergyInfo, UserProfile, VoiceGender } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bgColor: string;
  onSetBgColor: (color: string) => void;
  galaxyEnabled: boolean;
  setGalaxyEnabled: (val: boolean) => void;
  galaxyColorScheme: GalaxyColorScheme;
  setGalaxyColorScheme: (color: GalaxyColorScheme) => void;
  galaxySpeed: number;
  setGalaxySpeed: (speed: number) => void;
  galaxyOpacity: number;
  setGalaxyOpacity: (opacity: number) => void;
  onExportData: () => void;
  onImportData: (data: any) => void;
  onClearAllData: () => void;
  energyPercent?: number | null;
  rolloverInfo?: RolloverEnergyInfo;
  onUpdateEnergy?: (val: number) => void;
  onPerformRollover?: () => void;
  userProfile?: UserProfile;
  onUpdateUserProfile?: (profile: UserProfile) => void;
  voiceGender?: VoiceGender;
  onUpdateVoiceGender?: (gender: VoiceGender) => void;
  alertSound?: AlertSound;
  onUpdateAlertSound?: (sound: AlertSound) => void;
  onOpenMobileBridge?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  bgColor,
  onSetBgColor,
  galaxyEnabled,
  setGalaxyEnabled,
  galaxyColorScheme,
  setGalaxyColorScheme,
  galaxySpeed,
  setGalaxySpeed,
  galaxyOpacity,
  setGalaxyOpacity,
  onExportData,
  onImportData,
  onClearAllData,
  energyPercent = 80,
  rolloverInfo,
  onUpdateEnergy,
  onPerformRollover,
  userProfile,
  onUpdateUserProfile,
  voiceGender = 'female',
  onUpdateVoiceGender,
  alertSound = 'zen-crystal',
  onUpdateAlertSound,
  onOpenMobileBridge,
}) => {
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  // Profile Form state
  const [prenom, setPrenom] = useState(userProfile?.prenom || '');
  const [nom, setNom] = useState(userProfile?.nom || '');
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  // Voice state
  const [selectedVoice, setSelectedVoice] = useState<VoiceGender>(voiceGender);
  const [isSpeakingTest, setIsSpeakingTest] = useState(false);

  // Alert Sound state
  const [selectedAlertSound, setSelectedAlertSound] = useState<AlertSound>(alertSound);

  // Supabase state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [rpcStatus, setRpcStatus] = useState<string | null>(null);
  const [isTestingRpc, setIsTestingRpc] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setSupabaseUrl(cfg.url);
      setSupabaseKey(cfg.anonKey);
      setRpcStatus(null);
      if (userProfile) {
        setPrenom(userProfile.prenom || '');
        setNom(userProfile.nom || '');
      }
      setSelectedVoice(voiceGender);
      setSelectedAlertSound(alertSound);
    }
  }, [isOpen, userProfile, voiceGender, alertSound]);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateUserProfile) {
      onUpdateUserProfile({
        prenom: prenom.trim(),
        nom: nom.trim(),
      });
    }
    playCyberSound('success');
    setProfileSavedMsg(true);
    setTimeout(() => setProfileSavedMsg(false), 3000);
  };

  const handleTestVoice = () => {
    setIsSpeakingTest(true);
    const testText = prenom.trim()
      ? `Bonjour ${prenom.trim()}, je suis MajorI.A. Comment puis-je vous être utile aujourd'hui ?`
      : "Bonjour, je suis MajorI.A. Votre voix a été configurée avec succès.";
    speakCyberResponse(testText, selectedVoice, () => {
      setIsSpeakingTest(false);
    });
  };

  const handleTestSound = (sound: AlertSound) => {
    setSelectedAlertSound(sound);
    if (onUpdateAlertSound) {
      onUpdateAlertSound(sound);
    }
    playAlertSound(sound);
  };

  const handleSaveSupabase = () => {
    saveSupabaseConfig(supabaseUrl, supabaseKey);
    playCyberSound('success');
    setRpcStatus('Configuration Supabase enregistrée.');
  };

  const handleTestRpc = async () => {
    setIsTestingRpc(true);
    setRpcStatus(null);
    try {
      saveSupabaseConfig(supabaseUrl, supabaseKey);
      const res = await callUseCredit();
      if (res.isExhausted || res.balance === -1) {
        setRpcStatus('❌ Batterie IA déchargée (0% restant).');
        playCyberSound('alert');
        if (onUpdateEnergy) onUpdateEnergy(0);
      } else if (res.balance !== null) {
        setRpcStatus(`✅ RPC use_credit réussi ! Niveau de batterie actuel : ${res.balance}% (${res.source})`);
        playCyberSound('success');
        if (onUpdateEnergy) onUpdateEnergy(res.balance);
      } else {
        setRpcStatus(`⚠️ Réponse inattendue de Supabase : ${res.error || 'Erreur inconnue'}`);
      }
    } catch (err: any) {
      setRpcStatus(`❌ Erreur lors de l'appel RPC : ${err?.message || err}`);
      playCyberSound('alert');
    } finally {
      setIsTestingRpc(false);
    }
  };

  const handleManualRecharge = async (amount: number) => {
    try {
      const res = await fetch('/api/supabase/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const data = await res.json();
        if (onUpdateEnergy && typeof data.balance === 'number') {
          onUpdateEnergy(data.balance);
        }
      }
    } catch {}

    const cur = typeof energyPercent === 'number' ? energyPercent : 80;
    const updated = Math.min(150, cur + amount);
    if (onUpdateEnergy) onUpdateEnergy(updated);
    playCyberSound('success');
    setRpcStatus(`🔋 Batterie rechargée à ${updated}% (+${amount}%).`);
  };

  const BG_PRESETS = [
    { label: 'Espace Cosmique', val: '#020612' },
    { label: 'Obsidian Tech', val: '#0b1329' },
    { label: 'Deep Slate', val: '#0f172a' },
    { label: 'Cyber Violet', val: '#190a2e' },
    { label: 'Dark Neon', val: '#030805' },
    { label: 'Noir Pur', val: '#000000' },
  ];

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = 3840;
        const maxH = 2160;
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            const highResDataUrl = canvas.toDataURL('image/jpeg', 0.96);
            onSetBgColor(`url("${highResDataUrl}")`);
            playCyberSound('success');
            return;
          }
        }

        // If within standard high resolution or canvas not needed, use raw full quality
        onSetBgColor(`url("${rawDataUrl}")`);
        playCyberSound('success');
      };
      img.onerror = () => {
        alert("Erreur lors de la lecture de l'image");
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        onImportData(parsed);
        playCyberSound('success');
      } catch (err) {
        alert('Fichier JSON invalide');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="max-w-2xl w-full border-[0.5px] border-white/20 rounded-2xl bg-[#030914]/95 p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Settings className="w-5 h-5 text-sky-400" />
            <span>{t('settings.title')}</span>
          </div>
          <button
            onClick={() => {
              playCyberSound('click');
              onClose();
            }}
            className="p-1.5 rounded-xl border-[0.5px] border-white/15 bg-white/5 hover:bg-white/10 text-white cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 text-xs">
          {/* Section 0: Multi-language Support */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sky-300 font-bold text-sm">
                <Globe className="w-4 h-4 text-sky-400" />
                <span>{t('settings.languageTitle')}</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {t('settings.languageDesc')}
              </span>
            </div>

            <LanguageSelector variant="settings" />
          </div>

          {/* Section 1: User Profile Customization for Chatbot */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sky-300 font-bold text-sm">
                <User className="w-4 h-4 text-sky-400" />
                <span>{t('settings.identityTitle')}</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {t('settings.identityDesc')}
              </span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('settings.firstName')} :</label>
                  <input
                    type="text"
                    placeholder="Ex: Julien"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="w-full bg-slate-950/70 border-[0.5px] border-white/20 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-sans text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">{t('settings.lastName')} :</label>
                  <input
                    type="text"
                    placeholder="Ex: Dupont"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full bg-slate-950/70 border-[0.5px] border-white/20 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-sans text-xs focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-slate-400 italic">
                  {prenom ? `${t('settings.preview')} : "Bonjour ${prenom} !"` : t('settings.previewPrompt')}
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs border-[0.5px] border-white/30 transition-all cursor-pointer"
                >
                  {t('settings.saveProfile')}
                </button>
              </div>

              {profileSavedMsg && (
                <div className="p-2 rounded-lg bg-emerald-950/80 border-[0.5px] border-emerald-400/40 text-emerald-300 text-xs flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('settings.profileSaved')}</span>
                </div>
              )}
            </form>
          </div>

          {/* Section 2: Voice Customization (Homme / Femme) */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                <Volume2 className="w-4 h-4 text-purple-400" />
                <span>{t('settings.voiceTitle')}</span>
              </label>
              <span className="text-[11px] text-slate-400">{t('settings.voiceDesc')}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedVoice('female');
                  if (onUpdateVoiceGender) onUpdateVoiceGender('female');
                  playCyberSound('click');
                }}
                className={`p-3 rounded-xl border-[0.5px] text-left transition-all cursor-pointer ${
                  selectedVoice === 'female'
                    ? 'border-pink-400 bg-pink-500/15 text-pink-200 ring-1 ring-pink-400/50'
                    : 'border-white/15 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                <div className="font-bold text-sm flex items-center justify-between">
                  <span>{t('settings.voiceFemale')}</span>
                  {selectedVoice === 'female' && <CheckCircle2 className="w-4 h-4 text-pink-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{t('settings.voiceFemaleDesc')}</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedVoice('male');
                  if (onUpdateVoiceGender) onUpdateVoiceGender('male');
                  playCyberSound('click');
                }}
                className={`p-3 rounded-xl border-[0.5px] text-left transition-all cursor-pointer ${
                  selectedVoice === 'male'
                    ? 'border-sky-400 bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/50'
                    : 'border-white/15 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                <div className="font-bold text-sm flex items-center justify-between">
                  <span>{t('settings.voiceMale')}</span>
                  {selectedVoice === 'male' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{t('settings.voiceMaleDesc')}</div>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleTestVoice}
                disabled={isSpeakingTest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white font-bold text-xs border-[0.5px] border-white/20 transition-all cursor-pointer"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSpeakingTest ? 'animate-bounce' : ''}`} />
                <span>{isSpeakingTest ? t('settings.voiceListening') : t('settings.voiceListen')}</span>
              </button>
            </div>
          </div>

          {/* Section 3: Notification System & Custom Alert Sounds */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>{t('settings.alertTitle')}</span>
              </label>
              <span className="text-[11px] text-slate-400">{t('settings.alertDesc')}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'zen-crystal', label: 'Zen Crystal (Chime doux)' },
                  { id: 'digital-pulse', label: 'Digital Pulse (Futuriste)' },
                  { id: 'radar-harmonic', label: 'Radar Harmonique' },
                  { id: 'celestial-bell', label: 'Cloche Céleste' },
                  { id: 'soft-ping', label: 'Écho Discret' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleTestSound(s.id)}
                  className={`p-2.5 rounded-xl border-[0.5px] text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedAlertSound === s.id
                      ? 'border-amber-400 bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/40'
                      : 'border-white/15 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="font-semibold text-xs">{s.label}</span>
                  <span className="text-[10px] text-amber-400/80 mt-1 flex items-center gap-1">
                    <Volume2 className="w-3 h-3" /> {t('settings.testSound')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Battery / Consumption System & Automatic Monthly Rollover */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
                <span>{t('settings.energyTitle')}</span>
              </label>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border-[0.5px] border-white/20 text-xs font-mono">
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-white font-bold">{energyPercent}% {t('header.remaining')}</span>
              </div>
            </div>

            {/* Battery Gauge Bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span>{t('settings.energyLevel')} :</span>
                <span className="text-white font-bold font-mono">{energyPercent}% {t('settings.energyAvailable')}</span>
              </div>
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border-[0.5px] border-white/20 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, energyPercent || 80)}%` }}
                />
              </div>
            </div>

            {/* Monthly Rollover Logic Box */}
            <div className="p-3 rounded-lg bg-slate-950/80 border-[0.5px] border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  {t('settings.rolloverTitle')} :
                </span>
                <span className="text-emerald-300 font-bold">
                  {rolloverInfo?.rolloverEnergy || 35}% {t('settings.rolloverCarried')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {t('settings.rolloverDesc')}
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-300">
                  {t('settings.totalEnergyAvailable')} : <strong>{(energyPercent || 80) + (rolloverInfo?.rolloverEnergy || 35)}%</strong>
                </span>
                {onPerformRollover && (
                  <button
                    type="button"
                    onClick={() => {
                      onPerformRollover();
                      playCyberSound('success');
                    }}
                    className="px-2.5 py-1 rounded-md bg-emerald-600/30 hover:bg-emerald-600/50 border-[0.5px] border-emerald-400 text-emerald-200 text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    {t('settings.simulateRollover')}
                  </button>
                )}
              </div>
            </div>

            {/* Quick Recharge Test Bar */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-300">{t('settings.quickRecharge')} :</span>
              <button
                type="button"
                onClick={() => handleManualRecharge(20)}
                className="px-3 py-1.5 rounded-lg bg-emerald-950 border-[0.5px] border-emerald-400 text-emerald-300 font-bold text-xs cursor-pointer flex items-center gap-1.5 hover:bg-emerald-900/60 transition-colors"
              >
                <Battery className="w-3.5 h-3.5" />
                <span>+20% Batterie (Test)</span>
              </button>
            </div>
          </div>

          {/* Section 5: Mobile Bridge Shortcut */}
          {onOpenMobileBridge && (
            <div className="p-3.5 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="font-bold text-white text-xs">{t('settings.mobileBridgeTitle')}</div>
                  <div className="text-[11px] text-slate-400">{t('settings.mobileBridgeDesc')}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMobileBridge();
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-600/40 hover:bg-sky-600/70 border-[0.5px] border-sky-400 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>{t('settings.open')}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Section 6: Theme & Background */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-3">
            <label className="flex items-center gap-2 text-white font-semibold">
              <Palette className="w-4 h-4 text-pink-400" />
              {t('settings.themeTitle')}
            </label>

            <div className="grid grid-cols-3 gap-2">
              {BG_PRESETS.map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => {
                    playCyberSound('click');
                    onSetBgColor(preset.val);
                  }}
                  className={`p-2 rounded-xl border-[0.5px] text-left flex items-center gap-2 transition-all cursor-pointer ${
                    bgColor === preset.val
                      ? 'border-white/60 bg-white/20 text-white font-bold ring-1 ring-white/40'
                      : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border-[0.5px] border-white/40 shrink-0"
                    style={{ background: preset.val }}
                  />
                  <span className="truncate text-xs">{preset.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCustomBgUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border-[0.5px] border-white/20 text-white hover:bg-white/10 font-semibold cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                <span>{t('settings.customImage')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  onSetBgColor('#020612');
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 border-[0.5px] border-white/20 text-slate-300 hover:text-white font-semibold cursor-pointer"
              >
                {t('settings.reset')}
              </button>
              {/* Hidden file input for import if triggered programmatically */}
              <input
                type="file"
                ref={jsonInputRef}
                onChange={handleJsonImport}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {/* Reset Zone */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-rose-400">{t('settings.resetZone')} :</span>
            <button
              type="button"
              onClick={() => {
                playCyberSound('alert');
                onClearAllData();
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-950/60 border-[0.5px] border-rose-400/40 text-rose-200 hover:bg-rose-900 text-xs font-bold cursor-pointer"
            >
              {t('settings.clearAllData')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs border-[0.5px] border-white/30 shadow-md transition-all cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
