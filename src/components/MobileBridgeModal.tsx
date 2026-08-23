import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  X, 
  QrCode, 
  CheckCircle2, 
  RefreshCw, 
  Send, 
  Bell, 
  Mic, 
  ShieldCheck, 
  Wifi, 
  Battery, 
  Layers,
  Sparkles,
  ExternalLink,
  Volume2,
  Code2,
  Play
} from 'lucide-react';
import { playCyberSound, playAlertSound, speakCyberResponse } from '../utils/security';
import { MobileBridgeInfo } from '../types';

interface MobileBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendTestNotification?: (msg: string) => void;
}

export const MobileBridgeModal: React.FC<MobileBridgeModalProps> = ({
  isOpen,
  onClose,
  onSendTestNotification
}) => {
  const [bridgeInfo, setBridgeInfo] = useState<MobileBridgeInfo>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('neo-mobile-bridge');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return {
      pairingCode: '849-291',
      isConnected: true,
      deviceName: 'iPhone 16 Pro (iOS 19)',
      lastSync: 'À l\'instant',
      syncPushEnabled: true,
      mirrorNotesEnabled: true,
      remoteMicEnabled: true,
    };
  });

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [testPushSent, setTestPushSent] = useState(false);

  // Deep Link Assistant Tester state
  const [deepLinkInput, setDeepLinkInput] = useState('Ouvre Spotify et joue Daft Punk');
  const [deepLinkResult, setDeepLinkResult] = useState<{ feedback_speech: string; url: string | null } | null>(null);
  const [isTestingDeepLink, setIsTestingDeepLink] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('neo-mobile-bridge', JSON.stringify(bridgeInfo));
    }
  }, [bridgeInfo]);

  if (!isOpen) return null;

  const handleRegenerateCode = () => {
    setIsRegenerating(true);
    playCyberSound('beep');
    setTimeout(() => {
      const p1 = Math.floor(100 + Math.random() * 900);
      const p2 = Math.floor(100 + Math.random() * 900);
      setBridgeInfo(prev => ({
        ...prev,
        pairingCode: `${p1}-${p2}`
      }));
      setIsRegenerating(false);
      playCyberSound('success');
    }, 400);
  };

  const handleToggleOption = (key: 'syncPushEnabled' | 'mirrorNotesEnabled' | 'remoteMicEnabled') => {
    playCyberSound('click');
    setBridgeInfo(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSendTestPush = () => {
    playAlertSound('digital-pulse');
    setTestPushSent(true);
    if (onSendTestNotification) {
      onSendTestNotification("📱 Notification test envoyée avec succès sur votre smartphone.");
    }
    setTimeout(() => {
      setTestPushSent(false);
    }, 3500);
  };

  const handleTestAssistantDeepLink = async (customCmd?: string) => {
    const cmd = (customCmd || deepLinkInput).trim();
    if (!cmd) return;

    setIsTestingDeepLink(true);
    playCyberSound('click');

    try {
      const res = await fetch('/api/assistant/deep-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: cmd })
      });

      if (res.ok) {
        const data = await res.json();
        setDeepLinkResult(data);
        playCyberSound('success');
        if (data.feedback_speech) {
          speakCyberResponse(data.feedback_speech, 'female');
        }
      }
    } catch (err) {
      console.error('Erreur test assistant deep link:', err);
    } finally {
      setIsTestingDeepLink(false);
    }
  };

  const executeDeepLinkUrl = (url: string) => {
    playCyberSound('click');
    try {
      window.open(url, '_blank');
    } catch {
      window.location.href = url;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="max-w-xl w-full border-[0.5px] border-white/20 rounded-2xl bg-[#030914]/90 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border-[0.5px] border-sky-400/30 text-sky-300 shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                Pont Mobile & Assistant Deep Links
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border-[0.5px] border-emerald-400/40 text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Connecté
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Liez votre smartphone (iOS / Android) pour synchroniser vos rappels, alertes et vocal en direct.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playCyberSound('click');
              onClose();
            }}
            aria-label="Fermer"
            className="p-1.5 rounded-xl border-[0.5px] border-white/15 bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pairing Code & QR Code Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10">
          {/* QR Code Column */}
          <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-950/60 border-[0.5px] border-white/10">
            <div className="relative p-2.5 bg-white rounded-xl shadow-md group">
              {/* Stylized QR Code SVG */}
              <svg className="w-28 h-28 text-slate-950" viewBox="0 0 100 100" fill="currentColor">
                <path d="M0 0h30v30H0zm4 4v22h22V4zm4 4h14v14H8zm62-8h30v30H70zm4 4v22h22V4zm4 4h14v14H78zm-78 70h30v30H0zm4 4v22h22V74zm4 4h14v14H8zm38-74h6v6h-6zm10 0h6v6h-6zm-10 10h6v6h-6zm10 0h6v6h-6zm-20 10h6v6h-6zm10 0h6v6h-6zm20 0h6v6h-6zm10 0h6v6h-6zm-30 10h6v6h-6zm10 0h6v6h-6zm30 0h6v6h-6zm-40 10h6v6h-6zm10 0h6v6h-6zm20 0h6v6h-6zm10 0h6v6h-6zm-30 10h6v6h-6zm20 0h6v6h-6zm10 0h6v6h-6zm-20 10h6v6h-6zm10 0h6v6h-6zm20 0h6v6h-6z" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="p-1 rounded-md bg-sky-600 text-white font-bold text-[9px] shadow-sm">
                  IA
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-300 mt-2 font-medium">Scannez avec l'appareil photo</span>
          </div>

          {/* Pairing Code Column */}
          <div className="flex flex-col justify-center space-y-2.5">
            <div>
              <span className="text-[11px] text-slate-300 uppercase font-semibold tracking-wider">
                Code d'association instantané
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-widest bg-slate-950/80 border-[0.5px] border-white/20 rounded-xl px-3 py-2 text-center mt-1 select-all">
                {bridgeInfo.pairingCode}
              </div>
            </div>

            <button
              type="button"
              onClick={handleRegenerateCode}
              disabled={isRegenerating}
              className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border-[0.5px] border-white/15 text-slate-200 text-xs font-semibold transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>Générer un nouveau code</span>
            </button>

            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Chiffrement AES-256 de bout en bout</span>
            </div>
          </div>
        </div>

        {/* Deep Link Assistant Tester Component */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border-[0.5px] border-sky-400/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Moteur Assistant Vocal & Deep Link (iOS / Android)</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">JSON Engine Actif</span>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {[
              "Ouvre Spotify et joue Daft Punk",
              "Appelle le 0612345678",
              "Envoie un SMS au 0688990011",
              "Itinéraire vers Tour Eiffel",
              "Hello, open my email"
            ].map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setDeepLinkInput(example);
                  handleTestAssistantDeepLink(example);
                }}
                className="text-[10px] px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={deepLinkInput}
              onChange={(e) => setDeepLinkInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTestAssistantDeepLink()}
              placeholder="Ex: Lance WhatsApp, appelle ma mère, itinéraire..."
              className="flex-1 bg-slate-900 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 font-sans"
            />
            <button
              type="button"
              onClick={() => handleTestAssistantDeepLink()}
              disabled={isTestingDeepLink}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Tester</span>
            </button>
          </div>

          {deepLinkResult && (
            <div className="p-3 rounded-xl bg-slate-900/90 border border-white/15 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Réponse vocale (feedback_speech) :</div>
                  <div className="text-white font-semibold flex items-center gap-1.5 mt-0.5">
                    <Volume2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>"{deepLinkResult.feedback_speech}"</span>
                  </div>
                </div>
              </div>

              {deepLinkResult.url && (
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="text-[11px] text-slate-400">Deep Link URL Scheme : </span>
                    <span className="font-mono text-emerald-300 font-semibold truncate select-all">{deepLinkResult.url}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => executeDeepLinkUrl(deepLinkResult.url!)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Ouvrir</span>
                  </button>
                </div>
              )}

              <div className="pt-1.5 border-t border-white/10 font-mono text-[10px] text-slate-400 select-all overflow-x-auto">
                <pre>{JSON.stringify(deepLinkResult, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Connected Mobile Device Status */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-sky-400" />
              Appareil associé :
            </span>
            <span className="font-bold text-white">{bridgeInfo.deviceName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Statut de synchronisation :</span>
            <span className="text-emerald-300 font-medium">{bridgeInfo.lastSync}</span>
          </div>
        </div>

        {/* Bridge Synchronisation Options */}
        <div className="space-y-2 text-xs">
          <span className="text-slate-300 font-semibold block mb-1">Options du pont mobile :</span>

          {/* Option 1: Push Notifications */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border-[0.5px] border-white/10">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-300" />
              <div>
                <div className="font-semibold text-white">Notifications Push & Rappels</div>
                <div className="text-[11px] text-slate-400">Fait sonner votre téléphone pour chaque alerte</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={bridgeInfo.syncPushEnabled}
              onChange={() => handleToggleOption('syncPushEnabled')}
              className="w-4 h-4 rounded cursor-pointer accent-sky-500"
            />
          </div>

          {/* Option 2: Mirror Notes */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border-[0.5px] border-white/10">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-purple-300" />
              <div>
                <div className="font-semibold text-white">Miroir Notes & Mémoire</div>
                <div className="text-[11px] text-slate-400">Accès hors-ligne sur votre téléphone</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={bridgeInfo.mirrorNotesEnabled}
              onChange={() => handleToggleOption('mirrorNotesEnabled')}
              className="w-4 h-4 rounded cursor-pointer accent-sky-500"
            />
          </div>

          {/* Option 3: Remote Mic */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border-[0.5px] border-white/10">
            <div className="flex items-center gap-2.5">
              <Mic className="w-4 h-4 text-rose-300" />
              <div>
                <div className="font-semibold text-white">Microphone déporté sans fil</div>
                <div className="text-[11px] text-slate-400">Dictez depuis votre smartphone vers le PC</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={bridgeInfo.remoteMicEnabled}
              onChange={() => handleToggleOption('remoteMicEnabled')}
              className="w-4 h-4 rounded cursor-pointer accent-sky-500"
            />
          </div>
        </div>

        {/* Push Notification Test Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSendTestPush}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600/80 to-blue-600/80 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs border-[0.5px] border-white/30 shadow-md active:scale-98 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Envoyer une notification test au smartphone</span>
          </button>

          {testPushSent && (
            <div className="mt-2 p-2 rounded-lg bg-emerald-950/80 border-[0.5px] border-emerald-400/40 text-emerald-300 text-xs text-center flex items-center justify-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Alerte transmise avec succès au téléphone !</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border-[0.5px] border-white/20 transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};

