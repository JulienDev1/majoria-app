import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Upload, 
  Mic, 
  MicOff, 
  Camera,
  Video,
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  Trash2, 
  User, 
  X, 
  FileText,
  Loader2,
  Square,
  Sparkles,
  AlertCircle,
  Globe,
  ExternalLink,
  Search,
  BatteryWarning,
  BatteryCharging,
  Flame,
  Battery,
  WifiOff,
  Cpu,
  ChevronDown,
  ChevronUp,
  PanelLeftOpen,
  PanelLeftClose,
  Maximize2
} from 'lucide-react';
import { Conversation, UserProfile, VoiceGender } from '../types';
import { playCyberSound, cleanTextForSpeech, speakCyberResponse } from '../utils/security';
import { cleanSpokenTranscript, mergeSpeechSegments, removeRepeatedWordsAndPhrases } from '../utils/speechCleaner';
import { exportItemToPDF } from '../utils/pdfExport';
import { CameraVideoModal } from './CameraVideoModal';
import { FormattedMarkdown } from './FormattedMarkdown';
import { useLanguage } from '../context/LanguageContext';

interface ChatPanelProps {
  conversation: Conversation | null;
  chatBgImage?: string | null;
  onSendMessage: (text: string, image?: string) => Promise<void>;
  onClearConversation: () => void;
  isLoading: boolean;
  user: { nom: string } | null;
  userProfile?: UserProfile;
  confidentialMode?: boolean;
  onAddTag?: () => void;
  voiceAutoSpeak?: boolean;
  voiceGender?: VoiceGender;
  onOpenTranscription?: () => void;
  energyPercent?: number | null;
  onOpenForfaits?: () => void;
  isOnline?: boolean;
  isHeaderCollapsed?: boolean;
  onToggleCollapseHeader?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onUnfoldAllBars?: () => void;
  onCollapseAllBars?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  conversation,
  chatBgImage,
  onSendMessage,
  onClearConversation,
  isLoading,
  user,
  userProfile,
  onOpenTranscription,
  voiceGender = 'female',
  energyPercent = 80,
  onOpenForfaits,
  isOnline = true,
  isHeaderCollapsed = false,
  onToggleCollapseHeader,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onUnfoldAllBars,
  onCollapseAllBars,
}) => {
  const { t } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [dictationSeconds, setDictationSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Audio Recognition Refs
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dictationTimerRef = useRef<any>(null);
  const capturedTextRef = useRef<string>('');
  const baseInputTextRef = useRef<string>('');

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, isLoading]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, []);

  const stopAllMedia = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore
      }
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (dictationTimerRef.current) {
      clearInterval(dictationTimerRef.current);
      dictationTimerRef.current = null;
    }

    setIsDictating(false);
    setAudioLevel(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setSelectedImageName(file.name);
        playCyberSound('beep');
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const textContent = reader.result as string;
        setInputText((prev) => (prev ? `${prev}\n\n[Fichier: ${file.name}]\n${textContent}` : `[Fichier: ${file.name}]\n${textContent}`));
        playCyberSound('beep');
      };
      reader.readAsText(file);
    }
  };

  const startRecording = async () => {
    setMicErrorMessage(null);
    baseInputTextRef.current = inputText;
    capturedTextRef.current = '';
    setLiveTranscript('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicErrorMessage("La reconnaissance vocale n'est pas prise en charge par ce navigateur.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, avg * 2));
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + ' ';
          } else {
            interim += transcript;
          }
        }

        const combinedText = (final + interim).trim();
        capturedTextRef.current = combinedText;
        setLiveTranscript(combinedText);

        const base = baseInputTextRef.current ? baseInputTextRef.current.trim() : '';
        const fullDisplay = base ? `${base} ${combinedText}` : combinedText;
        setInputText(fullDisplay);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          setMicErrorMessage(`Erreur micro : ${event.error}`);
        }
      };

      recognition.onend = () => {
        // Stop media if ended
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsDictating(true);
      setDictationSeconds(0);
      playCyberSound('beep');

      dictationTimerRef.current = setInterval(() => {
        setDictationSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      setMicErrorMessage("Impossible d'accéder au microphone. Vérifiez les autorisations.");
      stopAllMedia();
    }
  };

  const stopRecordingAndSend = async (customText?: string) => {
    const rawToUse = customText || capturedTextRef.current || inputText;
    stopAllMedia();

    setTimeout(async () => {
      const cleaned = cleanSpokenTranscript(rawToUse);
      if (cleaned.trim()) {
        setInputText('');
        setLiveTranscript('');
        capturedTextRef.current = '';
        await onSendMessage(cleaned.trim(), selectedImage || undefined);
        setSelectedImage(null);
        setSelectedImageName(null);
      }
    }, 120);
  };

  const handleToggleDictation = () => {
    if (isDictating) {
      const base = baseInputTextRef.current ? baseInputTextRef.current.trim() : '';
      const textToSend = capturedTextRef.current.trim()
        ? (base ? `${base} ${capturedTextRef.current.trim()}` : capturedTextRef.current.trim())
        : inputText.trim();

      if (textToSend) {
        stopRecordingAndSend(textToSend);
      } else {
        stopAllMedia();
      }
    } else {
      startRecording();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDictating) {
      stopAllMedia();
    }
    const text = cleanSpokenTranscript(inputText.trim());
    const image = selectedImage;
    if (!text && !image) return;

    setInputText('');
    setSelectedImage(null);
    setSelectedImageName(null);
    setLiveTranscript('');
    capturedTextRef.current = '';

    await onSendMessage(text, image || undefined);
  };

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    playCyberSound('beep');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSpeakMessage = (text: string, index: number) => {
    if (speakingIndex === index) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    setSpeakingIndex(index);
    speakCyberResponse(text, (voiceGender as VoiceGender) || 'female', () => {
      setSpeakingIndex(null);
    });
  };

  const effectiveEnergy = typeof energyPercent === 'number' ? energyPercent : 80;
  const userName = userProfile?.prenom || user?.nom || 'Utilisateur';

  const bgStyle = chatBgImage
    ? {
        backgroundImage: chatBgImage.startsWith('url(') ? chatBgImage : `url("${chatBgImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : undefined;

  return (
    <div 
      className="flex-1 min-h-0 flex flex-col h-full bg-[var(--fb-bg)] text-[var(--fb-text-primary)] relative overflow-hidden"
      style={bgStyle}
    >
      {/* Header bar of Chat */}
      <div className="relative z-10 px-3 sm:px-5 py-2.5 bg-[var(--chat-header-bg)] backdrop-blur-md border-b border-[var(--chat-header-border)] flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          {/* Toggle Sidebar Button directly in Chat Header */}
          {onToggleSidebar && (
            <button
              onClick={() => {
                playCyberSound('click');
                onToggleSidebar();
              }}
              title={isSidebarCollapsed ? "Afficher le menu latéral" : "Masquer le menu latéral"}
              className="w-9 h-9 rounded-full bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] flex items-center justify-center transition-all cursor-pointer"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5 text-[var(--fb-blue)]" />
              ) : (
                <PanelLeftClose className="w-5 h-5 text-[var(--fb-text-secondary)]" />
              )}
            </button>
          )}

          {/* Contact Header info (Avatar + Name + Status) */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <img 
                src="/maskable_icon.png" 
                alt="MajorI.A" 
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shadow-sm" 
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[var(--fb-green)] border-2 border-[var(--fb-surface)]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-[var(--fb-text-primary)] text-sm sm:text-base truncate leading-tight">
                  {conversation?.titre || `${t('nav.chat')} (${userName})`}
                </h2>
                <Check className="w-3.5 h-3.5 text-[var(--fb-blue)] shrink-0" />
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--fb-text-secondary)] leading-tight font-medium">
                <span className="flex items-center gap-1 text-[var(--fb-green)]">
                  <span>En ligne</span>
                </span>
                {!isOnline && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                    <WifiOff className="w-3 h-3" />
                    <span>Hors-ligne</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Toggle Full Screen / Collapse all bars */}
          {onToggleCollapseHeader && (
            <button
              onClick={() => {
                playCyberSound('click');
                onToggleCollapseHeader();
              }}
              title={isHeaderCollapsed ? "Afficher l'en-tête" : "Plein écran"}
              className="w-9 h-9 rounded-full bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)] flex items-center justify-center transition-all cursor-pointer"
            >
              {isHeaderCollapsed ? (
                <ChevronDown className="w-5 h-5 text-[var(--fb-blue)]" />
              ) : (
                <ChevronUp className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Delete / Clear Chat */}
          <button
            onClick={() => {
              playCyberSound('alert');
              onClearConversation();
            }}
            title={t('chat.clearConv')}
            className="w-9 h-9 rounded-full bg-[var(--fb-surface-secondary)] hover:bg-rose-500/20 text-[var(--fb-text-secondary)] hover:text-[var(--fb-red)] flex items-center justify-center transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area with transparent / translucent cards */}
      <div 
        ref={scrollContainerRef}
        className="relative z-10 flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 max-w-4xl w-full mx-auto"
      >
        {(!conversation || conversation.messages.length === 0) ? (
          <div className="space-y-4 my-auto py-4">
            {/* Transparent "Create Post" Box */}
            <div className="bg-[var(--fb-card-translucent)] backdrop-blur-xs rounded-2xl p-4 sm:p-5 border border-[var(--fb-card-border)] shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[var(--fb-blue)] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                  {userProfile?.prenom ? userProfile.prenom[0].toUpperCase() : <User className="w-5 h-5" />}
                </div>
                <div 
                  onClick={() => setInputText("Bonjour MajorI.A, aide-moi à...")}
                  className="flex-1 bg-[var(--fb-surface)]/60 hover:bg-[var(--fb-surface)]/90 text-[var(--fb-text-primary)] placeholder-[var(--fb-text-secondary)] text-sm sm:text-base px-4 py-2.5 rounded-full cursor-pointer transition-colors border border-[var(--fb-border-light)] font-medium"
                >
                  Que voulez-vous demander à l'IA, {userProfile?.prenom || userName} ?
                </div>
              </div>
            </div>

            {/* Quick Suggestion Cards */}
            <div className="bg-[var(--fb-card-translucent)] backdrop-blur-xs rounded-2xl p-4 sm:p-5 border border-[var(--fb-card-border)] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--fb-text-primary)] text-sm">Suggestions de requêtes rapides</span>
                <span className="text-xs text-[var(--fb-blue)] font-bold">Fil d'actualité IA</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {[
                  "Rappelle-moi d'appeler le médecin à 15h",
                  "Quelles sont les dernières actualités mondiales ?",
                  "Crée une tâche urgente pour finaliser le rapport",
                  "Mémorise le code d'accès de l'immeuble",
                ].map((promptText, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(promptText);
                      playCyberSound('beep');
                    }}
                    className="p-3 rounded-xl bg-[var(--fb-surface)]/60 hover:bg-[var(--fb-surface)]/90 hover:text-[var(--fb-blue)] border border-[var(--fb-border-light)] hover:border-[var(--fb-blue)]/50 text-left text-xs font-bold text-[var(--fb-text-primary)] transition-all cursor-pointer flex items-center gap-2.5 shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-full bg-[var(--fb-blue-light)] flex items-center justify-center shrink-0 shadow-xs text-[var(--fb-blue)]">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <span className="line-clamp-2">{promptText}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          conversation.messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <img 
                    src="/maskable_icon.png" 
                    alt="MajorI.A" 
                    className="w-9 h-9 rounded-full object-cover shrink-0 shadow-sm mt-1 ring-1 ring-white/50" 
                  />
                )}

                {/* Message Bubble: Transparent for both User and Assistant to clearly see the background */}
                <div
                  className={`relative transition-all break-words ${
                    isUser
                      ? 'bg-[var(--chat-bubble-user)] backdrop-blur-xs text-white border border-[var(--chat-bubble-border-user)] p-3.5 sm:p-4 rounded-2xl rounded-tr-xs max-w-[85%] sm:max-w-[75%] shadow-sm'
                      : 'bg-[var(--chat-bubble-assistant)] backdrop-blur-xs text-[var(--fb-text-primary)] border border-[var(--chat-bubble-border-ai)] p-4 sm:p-5 rounded-2xl shadow-sm max-w-[95%] sm:max-w-[88%] w-full'
                  }`}
                >
                  {/* AI Header */}
                  {!isUser && (
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--fb-border-light)]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--fb-text-primary)] text-sm">MajorI.A</span>
                        <Check className="w-3.5 h-3.5 text-[var(--fb-blue)]" />
                        <span className="text-xs text-[var(--fb-text-secondary)] font-medium flex items-center gap-1">
                          • {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          <Globe className="w-3 h-3 text-[var(--fb-text-muted)] ml-0.5 inline" />
                        </span>
                      </div>

                      {msg.offline && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] text-amber-700 dark:text-amber-300 font-bold border border-amber-400/40">
                          <Cpu className="w-3 h-3" />
                          Local
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Image Attachment */}
                  {msg.image && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-[var(--fb-card-border)] max-w-sm shadow-xs">
                      <img src={msg.image} alt="Envoyé" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  {/* Message Text Content */}
                  <div className={`text-sm sm:text-[15px] leading-relaxed break-words font-sans font-medium ${isUser ? 'text-white' : 'text-[var(--fb-text-primary)]'}`}>
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.contenu}</div>
                    ) : !msg.contenu && isLoading && idx === conversation.messages.length - 1 ? (
                      <div className="flex items-center gap-2 text-sm text-[var(--fb-blue)] font-bold py-2">
                        <Loader2 className="w-4 h-4 text-[var(--fb-blue)] animate-spin" />
                        <span className="animate-pulse">MajorI.A génère votre réponse...</span>
                      </div>
                    ) : (
                      <div className="relative prose prose-slate dark:prose-invert max-w-none">
                        <FormattedMarkdown content={msg.contenu} />
                        {isLoading && idx === conversation.messages.length - 1 && (
                          <span className="inline-block w-1.5 h-4 ml-1 bg-[var(--fb-blue)] animate-pulse rounded-sm align-middle" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Grounded Google Search Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[var(--fb-border-light)] space-y-2">
                      <div className="text-xs font-bold text-[var(--fb-text-primary)] flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[var(--fb-blue)]" />
                        <span>Sources & Liens associés :</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.sources.map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--fb-surface)]/60 hover:bg-[var(--fb-surface)]/90 border border-[var(--fb-border-light)] text-xs text-[var(--fb-text-primary)] hover:text-[var(--fb-blue)] font-semibold transition-colors"
                          >
                            <span className="truncate font-medium">{src.title}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-[var(--fb-text-secondary)] shrink-0 ml-1.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Bar (Like, Copy, Audio, Share) */}
                  {!isUser && (
                    <div className="mt-4 pt-2.5 border-t border-[var(--fb-border-light)] flex items-center justify-between text-xs text-[var(--fb-text-primary)] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          playCyberSound('beep');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--fb-surface)]/50 hover:text-[var(--fb-blue)] transition-colors cursor-pointer"
                      >
                        <span>👍</span>
                        <span>J'aime</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.contenu, idx)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--fb-surface)]/50 hover:text-[var(--fb-text-primary)] transition-colors cursor-pointer"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-4 h-4 text-[var(--fb-green)]" />
                            <span className="text-[var(--fb-green)]">Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSpeakMessage(msg.contenu, idx)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--fb-surface)]/50 hover:text-[var(--fb-blue)] transition-colors cursor-pointer"
                      >
                        {speakingIndex === idx ? (
                          <>
                            <VolumeX className="w-4 h-4 text-[var(--fb-red)]" />
                            <span className="text-[var(--fb-red)]">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4 text-[var(--fb-blue)]" />
                            <span>Écouter</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => exportItemToPDF('conversation', { titre: "Réponse MajorI.A", contenu: msg.contenu, date: msg.date })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--fb-surface)]/50 hover:text-[var(--fb-text-primary)] transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                    </div>
                  )}

                  {/* Timestamp for user bubbles */}
                  {isUser && (
                    <div className="mt-1 text-[10px] text-white/90 text-right font-medium">
                      {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-9 h-9 rounded-full bg-[var(--fb-blue)] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm mt-1 ring-1 ring-white/50">
                    {userProfile?.prenom ? userProfile.prenom[0].toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (!conversation || conversation.messages.length === 0 || conversation.messages[conversation.messages.length - 1].role === 'user') && (
          <div className="flex gap-2.5 items-center">
            <img 
              src="/maskable_icon.png" 
              alt="MajorI.A" 
              className="w-9 h-9 rounded-full object-cover shrink-0 shadow-sm" 
            />
            <div className="p-3.5 rounded-2xl bg-[var(--chat-bubble-assistant)] backdrop-blur-xs border border-[var(--chat-bubble-border-ai)] flex items-center gap-2 text-xs font-bold text-[var(--fb-text-primary)] shadow-sm">
              <Loader2 className="w-4 h-4 text-[var(--fb-blue)] animate-spin" />
              <span>MajorI.A réfléchit et formule sa réponse...</span>
            </div>
          </div>
        )}

        {/* Mic error notice if any */}
        {micErrorMessage && (
          <div className="p-3 rounded-xl bg-rose-50/90 backdrop-blur-xs border border-rose-200 text-[#fa383e] text-xs font-bold flex items-center justify-between shadow-sm">
            <span>{micErrorMessage}</span>
            <button onClick={() => setMicErrorMessage(null)} className="p-1 hover:text-rose-900 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Live Audio Dictation Bar */}
        {isDictating && (
          <div className="p-3.5 rounded-2xl bg-white/40 backdrop-blur-xs border-2 border-[#fa383e] shadow-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#fa383e] animate-ping inline-block" />
              <div>
                <div className="font-bold text-[#fa383e] text-xs sm:text-sm">Microphone actif ({dictationSeconds}s)</div>
                <div className="text-xs text-[#050505] font-medium truncate max-w-xs sm:max-w-md">
                  {liveTranscript ? `"${liveTranscript}"` : "Parlez, le texte s'inscrit en direct..."}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-16 sm:w-24 h-2 bg-white/60 rounded-full overflow-hidden border border-[#ced0d4]">
                <div 
                  className="h-full bg-[#fa383e] transition-all duration-75"
                  style={{ width: `${Math.max(20, audioLevel)}%` }}
                />
              </div>
              <button
                type="button"
                onClick={() => stopRecordingAndSend()}
                className="px-3 py-1.5 bg-[#fa383e] hover:bg-rose-600 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Envoyer</span>
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bottom Bar */}
      <div className="relative z-10 p-2.5 sm:p-3.5 bg-[var(--chat-input-bg)] backdrop-blur-md border-t border-[var(--chat-input-border)] shrink-0 shadow-sm">
        
        {/* Exhausted Battery Notice Banner */}
        {effectiveEnergy <= 0 && (
          <div className="mb-2.5 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-[var(--fb-red)] flex items-center justify-between gap-3 max-w-4xl mx-auto shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <BatteryWarning className="w-4 h-4 text-[var(--fb-red)] shrink-0 animate-pulse" />
              <span>{t('chat.batteryExhausted')}</span>
            </div>
            {onOpenForfaits && (
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  onOpenForfaits();
                }}
                className="px-3 py-1 rounded-full bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] text-white text-xs font-bold shrink-0 shadow-sm"
              >
                {t('chat.recharge')}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-1.5 sm:gap-2 max-w-4xl mx-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,.txt,.md,.json,.csv,.pdf"
            className="hidden"
          />

          {/* Plus / Upload attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isTranscribingAudio}
            title="Joindre un fichier"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-blue)] flex items-center justify-center transition-all shrink-0 cursor-pointer"
          >
            <Upload className="w-4.5 h-4.5" />
          </button>

          {/* Camera / Video Button */}
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              setIsCameraModalOpen(true);
            }}
            disabled={isLoading || isTranscribingAudio}
            title="Prendre une photo ou vidéo"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-green)] flex items-center justify-center transition-all shrink-0 cursor-pointer"
          >
            <Camera className="w-4.5 h-4.5" />
          </button>

          {/* Main Text Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={isDictating ? t('chat.listening') : isTranscribingAudio ? t('chat.transcribing') : t('chat.inputPlaceholder')}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading || isTranscribingAudio}
              className={`w-full h-10 sm:h-11 bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] focus:bg-[var(--fb-surface)] border border-[var(--fb-border)] focus:border-[var(--fb-blue)] rounded-full px-4 text-xs sm:text-sm text-[var(--fb-text-primary)] placeholder-[var(--fb-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--fb-blue)]/20 font-sans transition-all ${
                isDictating ? 'ring-2 ring-[var(--fb-red)] bg-rose-500/10 border-[var(--fb-red)]' : ''
              }`}
            />
          </div>

          {/* Mic Button */}
          <button
            type="button"
            onClick={handleToggleDictation}
            disabled={isTranscribingAudio || isLoading}
            title={isDictating ? "Arrêter la dictée" : "Dictée vocale"}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all shrink-0 flex items-center justify-center cursor-pointer ${
              isDictating
                ? 'bg-[var(--fb-red)] text-white animate-pulse shadow-sm'
                : 'bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-red)]'
            }`}
          >
            {isTranscribingAudio ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin text-[var(--fb-blue)]" />
            ) : isDictating ? (
              <MicOff className="w-4.5 h-4.5 text-white" />
            ) : (
              <Mic className="w-4.5 h-4.5" />
            )}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage) || isLoading || isTranscribingAudio}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shrink-0 shadow-sm active:scale-95 cursor-pointer"
            title={t('chat.send')}
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>

        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="mt-2.5 px-3 py-1.5 bg-[#f0f2f5] border border-[#e4e6eb] rounded-xl flex items-center gap-3 max-w-4xl mx-auto">
            <div className="relative w-9 h-9 rounded-lg border border-[#ced0d4] overflow-hidden bg-black">
              <img src={selectedImage} alt="Attachment" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(null);
                  setSelectedImageName(null);
                }}
                className="absolute top-0 right-0 bg-[#fa383e] text-white p-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
            <span className="text-xs font-medium text-[#050505] truncate">{selectedImageName}</span>
          </div>
        )}
      </div>

      {/* Camera & Video Modal */}
      <CameraVideoModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onSendPhotoOrVideo={(prompt, imgData) => {
          onSendMessage(prompt, imgData);
        }}
        onAttachImage={(imgData, name) => {
          setSelectedImage(imgData);
          setSelectedImageName(name);
        }}
      />
    </div>
  );
};
