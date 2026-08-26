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
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Volume2,
  Bell,
  Calendar,
  Globe,
  Sun,
  Moon
} from 'lucide-react';
import { playCyberSound, playAlertSound, speakCyberResponse } from '../utils/security';
import { GalaxyColorScheme } from './MilkyWayGalaxy';
import { getSupabaseConfig, saveSupabaseConfig, callUseCredit } from '../utils/supabase';
import { AlertSound, RolloverEnergyInfo, UserProfile, VoiceGender, ThemeMode } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode?: ThemeMode;
  resolvedTheme?: 'light' | 'dark';
  onSetThemeMode?: (mode: ThemeMode) => void;
  onToggleTheme?: () => void;
  chatBgImage?: string | null;
  onSetChatBgImage?: (image: string | null) => void;
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
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  themeMode = 'system',
  resolvedTheme = 'light',
  onSetThemeMode,
  onToggleTheme,
  chatBgImage,
  onSetChatBgImage,
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
}) => {
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);
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

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Veuillez sélectionner un fichier image valide (JPG, PNG, WEBP, etc.).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = 1920;
        const maxH = 1080;
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          if (onSetChatBgImage) {
            onSetChatBgImage(optimizedDataUrl);
          } else {
            onSetBgColor(`url("${optimizedDataUrl}")`);
          }
          playCyberSound('success');
          return;
        }

        if (onSetChatBgImage) {
          onSetChatBgImage(rawDataUrl);
        } else {
          onSetBgColor(`url("${rawDataUrl}")`);
        }
        playCyberSound('success');
      };
      img.onerror = () => {
        alert("Erreur lors du chargement de l'image.");
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="max-w-2xl w-full border border-[var(--fb-border)] rounded-2xl bg-[var(--fb-surface)] text-[var(--fb-text-primary)] p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--fb-border-light)]">
          <div className="flex items-center gap-2 font-bold text-[var(--fb-text-primary)] text-base sm:text-lg">
            <div className="w-8 h-8 rounded-full bg-[var(--fb-blue)] text-white flex items-center justify-center shadow-xs">
              <Settings className="w-4 h-4" />
            </div>
            <span>{t('settings.title')}</span>
          </div>
          <button
            onClick={() => {
              playCyberSound('click');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)] flex items-center justify-center cursor-pointer transition-all"
            title={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          
          {/* Section 0: Theme Mode (Light / Dark / Auto) */}
          <div className="p-4 rounded-2xl bg-[var(--fb-surface-tertiary)] border border-[var(--fb-border-light)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[var(--fb-text-primary)] font-bold text-sm">
                {resolvedTheme === 'dark' ? (
                  <Moon className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <span>{t('settings.themeMode')} (Mode Clair / Mode Sombre)</span>
              </label>
              <span className="text-[11px] text-[var(--fb-text-secondary)] font-medium">
                {resolvedTheme === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
              </span>
            </div>

            <p className="text-xs text-[var(--fb-text-secondary)] leading-relaxed">
              {t('settings.themeModeDesc')}
            </p>

            {/* Quick 1-Click Action Button */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {onToggleTheme && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleTheme();
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] text-white font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  {resolvedTheme === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-300 animate-spin-slow" />
                      <span>{language === 'en' ? 'Switch to Light Mode' : 'Basculer en Mode Clair'}</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-indigo-200" />
                      <span>{language === 'en' ? 'Switch to Dark Mode' : 'Basculer en Mode Sombre'}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* 2-Way Theme Choices: Light & Dark Mode */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Light Mode Choice */}
              <button
                type="button"
                onClick={() => {
                  if (onSetThemeMode) onSetThemeMode('light');
                  playCyberSound('click');
                }}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  themeMode === 'light'
                    ? 'border-[var(--fb-blue)] bg-[var(--fb-blue-light)] text-[var(--fb-blue)] font-bold shadow-xs ring-1 ring-[var(--fb-blue)]'
                    : 'border-[var(--fb-border)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] hover:bg-[var(--fb-surface-secondary)]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs">
                  <Sun className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-bold">{t('settings.themeLight')}</span>
                <span className="text-[11px] text-[var(--fb-text-secondary)]">Fond clair Facebook</span>
              </button>

              {/* Dark Mode Choice */}
              <button
                type="button"
                onClick={() => {
                  if (onSetThemeMode) onSetThemeMode('dark');
                  playCyberSound('click');
                }}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  themeMode === 'dark'
                    ? 'border-[var(--fb-blue)] bg-[var(--fb-blue-light)] text-[var(--fb-blue)] font-bold shadow-xs ring-1 ring-[var(--fb-blue)]'
                    : 'border-[var(--fb-border)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] hover:bg-[var(--fb-surface-secondary)]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-indigo-900/60 text-indigo-300 flex items-center justify-center shadow-2xs">
                  <Moon className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-bold">{t('settings.themeDark')}</span>
                <span className="text-[11px] text-[var(--fb-text-secondary)]">Repos visuel sombre</span>
              </button>
            </div>
          </div>

          {/* Section 1: Multi-language Support */}
          <div className="p-4 rounded-2xl bg-[var(--fb-surface-tertiary)] border border-[var(--fb-border-light)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[var(--fb-text-primary)] font-bold text-sm">
                <Globe className="w-4 h-4 text-[var(--fb-blue)]" />
                <span>{t('settings.languageTitle')}</span>
              </label>
              <span className="text-[11px] text-[var(--fb-text-secondary)] font-medium">
                {t('settings.languageDesc')}
              </span>
            </div>

            <LanguageSelector variant="settings" />
          </div>

          {/* Section 2: User Profile Customization for Chatbot */}
          <div className="p-4 rounded-2xl bg-[var(--fb-surface-tertiary)] border border-[var(--fb-border-light)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[var(--fb-text-primary)] font-bold text-sm">
                <User className="w-4 h-4 text-[var(--fb-blue)]" />
                <span>{t('settings.identityTitle')}</span>
              </label>
              <span className="text-[11px] text-[var(--fb-text-secondary)] font-medium">
                {t('settings.identityDesc')}
              </span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[var(--fb-text-secondary)] font-bold mb-1">{t('settings.firstName')} :</label>
                  <input
                    type="text"
                    placeholder="Ex: Julien"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="w-full bg-[var(--fb-surface)] border border-[var(--fb-border)] focus:border-[var(--fb-blue)] rounded-xl px-3 py-2 text-[var(--fb-text-primary)] placeholder-[var(--fb-text-muted)] font-sans text-xs focus:outline-none focus:ring-1 focus:ring-[var(--fb-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-[var(--fb-text-secondary)] font-bold mb-1">{t('settings.lastName')} :</label>
                  <input
                    type="text"
                    placeholder="Ex: Dupont"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full bg-[var(--fb-surface)] border border-[var(--fb-border)] focus:border-[var(--fb-blue)] rounded-xl px-3 py-2 text-[var(--fb-text-primary)] placeholder-[var(--fb-text-muted)] font-sans text-xs focus:outline-none focus:ring-1 focus:ring-[var(--fb-blue)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-[var(--fb-text-secondary)] italic font-medium">
                  {prenom.trim() ? (
                    <span className="text-[var(--fb-blue)] font-semibold">
                      👋 "Bonjour {prenom.trim()}, comment puis-je vous aider aujourd'hui ?"
                    </span>
                  ) : (
                    <span>{t('settings.previewPrompt')}</span>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] text-white font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0"
                >
                  {t('settings.saveProfile')}
                </button>
              </div>

              {profileSavedMsg && (
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('settings.profileSaved')}</span>
                </div>
              )}
            </form>
          </div>

          {/* Section 3: Voice Selection */}
          <div className="p-4 rounded-2xl bg-[var(--fb-surface-tertiary)] border border-[var(--fb-border-light)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[var(--fb-text-primary)] font-bold text-sm">
                <Volume2 className="w-4 h-4 text-[var(--fb-blue)]" />
                <span>{t('settings.voiceTitle')}</span>
              </label>
              <span className="text-[11px] text-[var(--fb-text-secondary)] font-medium">{t('settings.voiceDesc')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedVoice('female');
                  if (onUpdateVoiceGender) onUpdateVoiceGender('female');
                  playCyberSound('click');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedVoice === 'female'
                    ? 'border-[var(--fb-blue)] bg-[var(--fb-blue-light)] text-[var(--fb-blue)] font-semibold'
                    : 'border-[var(--fb-border)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] hover:bg-[var(--fb-surface-secondary)]'
                }`}
              >
                <div className="font-bold text-sm flex items-center justify-between">
                  <span>{t('settings.voiceFemale')}</span>
                  {selectedVoice === 'female' && <CheckCircle2 className="w-4 h-4 text-[var(--fb-blue)]" />}
                </div>
                <div className="text-[11px] text-[var(--fb-text-secondary)] mt-1 font-medium">{t('settings.voiceFemaleDesc')}</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedVoice('male');
                  if (onUpdateVoiceGender) onUpdateVoiceGender('male');
                  playCyberSound('click');
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedVoice === 'male'
                    ? 'border-[var(--fb-blue)] bg-[var(--fb-blue-light)] text-[var(--fb-blue)] font-semibold'
                    : 'border-[var(--fb-border)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] hover:bg-[var(--fb-surface-secondary)]'
                }`}
              >
                <div className="font-bold text-sm flex items-center justify-between">
                  <span>{t('settings.voiceMale')}</span>
                  {selectedVoice === 'male' && <CheckCircle2 className="w-4 h-4 text-[var(--fb-blue)]" />}
                </div>
                <div className="text-[11px] text-[var(--fb-text-secondary)] mt-1 font-medium">{t('settings.voiceMaleDesc')}</div>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleTestVoice}
                disabled={isSpeakingTest}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] font-bold text-xs transition-all cursor-pointer"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSpeakingTest ? 'animate-bounce text-[var(--fb-blue)]' : ''}`} />
                <span>{isSpeakingTest ? t('settings.voiceListening') : t('settings.voiceListen')}</span>
              </button>
            </div>
          </div>

          {/* Section 4: Notification System & Custom Alert Sounds */}
          <div className="p-4 rounded-2xl bg-[var(--fb-surface-tertiary)] border border-[var(--fb-border-light)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[var(--fb-text-primary)] font-bold text-sm">
                <Bell className="w-4 h-4 text-[var(--fb-gold)]" />
                <span>{t('settings.alertTitle')}</span>
              </label>
              <span className="text-[11px] text-[var(--fb-text-secondary)] font-medium">{t('settings.alertDesc')}</span>
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
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selectedAlertSound === s.id
                      ? 'border-[var(--fb-gold)] bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
                      : 'border-[var(--fb-border)] bg-[var(--fb-surface)] text-[var(--fb-text-primary)] hover:bg-[var(--fb-surface-secondary)]'
                  }`}
                >
                  <span className="font-bold text-xs">{s.label}</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                    <Volume2 className="w-3 h-3" /> {t('settings.testSound')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Chat Background Image Customization */}
          <div className="p-4 rounded-2xl bg-[var(--fb-surface-tertiary)] border border-[var(--fb-border-light)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[var(--fb-text-primary)] font-bold text-sm">
                <ImageIcon className="w-4 h-4 text-[var(--fb-blue)]" />
                <span>Image de fond du Chat</span>
              </label>
              <span className="text-[11px] text-[var(--fb-text-secondary)] font-medium">Personnalisation</span>
            </div>

            <p className="text-xs text-[var(--fb-text-secondary)] leading-relaxed">
              Importez une photo ou image personnalisée depuis votre appareil pour l'afficher en fond d'écran du chat.
            </p>

            {/* Hidden Background File Input */}
            <input
              type="file"
              ref={bgInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleCustomBgUpload}
            />

            {/* Action Buttons & Preview */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  bgInputRef.current?.click();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importer une image de fond</span>
              </button>

              {chatBgImage && (
                <button
                  type="button"
                  onClick={() => {
                    playCyberSound('alert');
                    if (onSetChatBgImage) {
                      onSetChatBgImage(null);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-rose-500/15 border border-rose-500/30 text-[var(--fb-red)] hover:bg-rose-500/25 font-bold text-xs transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer l'image</span>
                </button>
              )}
            </div>

            {/* Thumbnail Preview when background image is set */}
            {chatBgImage && (
              <div className="relative rounded-xl overflow-hidden border border-[var(--fb-border)] h-28 w-full sm:w-64 mt-2 shadow-xs group">
                <img 
                  src={chatBgImage.startsWith('url(') ? chatBgImage.slice(5, -2) : chatBgImage} 
                  alt="Aperçu fond du chat" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 flex items-end p-2">
                  <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[var(--fb-green)]" /> Fond actif
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Reset Zone */}
          <div className="pt-2 border-t border-[var(--fb-border-light)] flex items-center justify-between">
            <span className="text-xs text-[var(--fb-red)] font-bold">{t('settings.resetZone')} :</span>
            <button
              type="button"
              onClick={() => {
                playCyberSound('alert');
                onClearAllData();
              }}
              className="px-3.5 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[var(--fb-red)] hover:bg-rose-500/25 text-xs font-bold cursor-pointer transition-all"
            >
              {t('settings.clearAllData')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--fb-border-light)] flex justify-end">
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              onClose();
            }}
            className="px-5 py-2 rounded-full bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
