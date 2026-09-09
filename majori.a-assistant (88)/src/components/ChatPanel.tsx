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
  Maximize2,
  BookmarkPlus
} from 'lucide-react';
import { Conversation, Priority, UserProfile, VoiceGender } from '../types';
import { playCyberSound, cleanTextForSpeech, speakCyberResponse } from '../utils/security';
import { cleanSpokenTranscript, mergeSpeechSegments, removeRepeatedWordsAndPhrases } from '../utils/speechCleaner';
import { exportItemToPDF } from '../utils/pdfExport';
import { CameraVideoModal } from './CameraVideoModal';
import { FormattedMarkdown } from './FormattedMarkdown';
import { NewsHeadlineFeed } from './NewsHeadlineFeed';
import { SaveToDestinationModal, DestinationType } from './SaveToDestinationModal';
import { useLanguage } from '../context/LanguageContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

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
  onSaveToDestination?: (
    destination: DestinationType,
    text: string,
    options?: { title?: string; date?: string; time?: string; priority?: Priority }
  ) => Promise<void>;
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
  onSaveToDestination,
}) => {
  const { t } = useLanguage();
  const contextNetworkOnline = useNetworkStatus();
  const effectiveIsOnline = typeof isOnline === 'boolean' ? isOnline : contextNetworkOnline;
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalText, setSaveModalText] = useState('');
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

  // Audio Recognition & Recording Refs
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dictationTimerRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const capturedTextRef = useRef<string>('');
  const baseInputTextRef = useRef<string>('');
  const isDictatingRef = useRef<boolean>(false);

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

  // Stop recording cleanly on offline event and alert user
  useEffect(() => {
    const handleOffline = () => {
      if (isDictatingRef.current) {
        stopAllMedia();
        playCyberSound('alert');
        setMicErrorMessage('Transcription impossible hors ligne : enregistrement interrompu.');
      } else if (isTranscribingAudio) {
        setIsTranscribingAudio(false);
        playCyberSound('alert');
        setMicErrorMessage('Transcription impossible hors ligne');
      }
    };

    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('offline', handleOffline);
    };
  }, [isTranscribingAudio]);

  const stopAllMedia = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.stop();
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
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

    isDictatingRef.current = false;
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
    // Network offline check
    if (!isOnline) {
      playCyberSound('alert');
      setMicErrorMessage('Transcription impossible hors ligne');
      return;
    }

    setMicErrorMessage(null);
    baseInputTextRef.current = inputText;
    capturedTextRef.current = '';
    setLiveTranscript('');
    audioChunksRef.current = [];
    isDictatingRef.current = true;
    setIsDictating(true);
    setDictationSeconds(0);
    playCyberSound('beep');

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // 1. Setup Web Speech Recognition for instant real-time typing
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    let speechRecognitionActive = false;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          let fullFinal = '';
          let fullInterim = '';

          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0]?.transcript || '';
            if (event.results[i].isFinal) {
              fullFinal += (fullFinal ? ' ' : '') + transcript.trim();
            } else {
              fullInterim += (fullInterim ? ' ' : '') + transcript.trim();
            }
          }

          const combinedText = (fullFinal + (fullInterim ? ' ' + fullInterim : '')).trim();
          if (combinedText) {
            capturedTextRef.current = combinedText;
            setLiveTranscript(combinedText);

            const base = baseInputTextRef.current ? baseInputTextRef.current.trim() : '';
            const fullDisplay = base ? `${base} ${combinedText}` : combinedText;
            setInputText(fullDisplay);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition warning:', event?.error);
          if (event?.error === 'not-allowed') {
            setMicErrorMessage("Accès microphone non autorisé dans votre navigateur.");
          }
        };

        recognition.onend = () => {
          // If browser recognition automatically closes continuous session, we keep the captured text
          if (isDictatingRef.current) {
            try {
              // Try restarting if still dictating
              recognition.start();
            } catch (e) {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        speechRecognitionActive = true;
      } catch (speechErr) {
        console.warn('Web Speech API start warning:', speechErr);
      }
    }

    // 2. Setup Audio Visualizer & Fallback MediaRecorder
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        if (stream) {
          mediaStreamRef.current = stream;

          // Audio meter visualizer
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const audioCtx = new AudioContextClass();
              if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
              }
              audioContextRef.current = audioCtx;
              const analyser = audioCtx.createAnalyser();
              analyser.fftSize = 64;
              analyserRef.current = analyser;

              const source = audioCtx.createMediaStreamSource(stream);
              source.connect(analyser);

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const updateVolume = () => {
                if (!analyserRef.current || !isDictatingRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
                animationFrameRef.current = requestAnimationFrame(updateVolume);
              };
              updateVolume();
            }
          } catch (ctxErr) {
            console.warn('AudioContext meter:', ctxErr);
          }

            // Fallback recorder if SpeechRecognition is not available or misses last words
            try {
              let chosenMimeType = '';
              if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
                const types = [
                  'audio/webm;codecs=opus',
                  'audio/webm',
                  'audio/mp4',
                  'audio/aac',
                  'audio/ogg;codecs=opus',
                  'audio/ogg',
                  'audio/wav'
                ];
                for (const t of types) {
                  if (MediaRecorder.isTypeSupported(t)) {
                    chosenMimeType = t;
                    break;
                  }
                }
              }

              let mediaRecorder: MediaRecorder;
              if (chosenMimeType) {
                mediaRecorder = new MediaRecorder(stream, { mimeType: chosenMimeType });
              } else {
                mediaRecorder = new MediaRecorder(stream);
              }

              mediaRecorderRef.current = mediaRecorder;
              audioChunksRef.current = [];

              mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                  audioChunksRef.current.push(e.data);
                }
              };

              mediaRecorder.start(100);
            } catch (recErr) {
              console.warn('MediaRecorder fallback init:', recErr);
            }
        }
      }
    } catch (mediaErr) {
      console.warn('getUserMedia warning:', mediaErr);
    }

    if (!speechRecognitionActive && !mediaStreamRef.current) {
      setMicErrorMessage("Impossible d'activer le microphone.");
      stopAllMedia();
      return;
    }

    dictationTimerRef.current = setInterval(() => {
      setDictationSeconds((s) => s + 1);
    }, 1000);
  };

  const stopRecordingAndSend = async (customText?: string) => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    isDictatingRef.current = false;
    setIsDictating(false);
    playCyberSound('click');

    const base = baseInputTextRef.current ? baseInputTextRef.current.trim() : '';
    const captured = capturedTextRef.current.trim();
    const currentInput = inputText.trim();

    let textToUse = customText?.trim() || captured || currentInput;
    if (textToUse && base && !textToUse.startsWith(base)) {
      textToUse = `${base} ${textToUse}`.trim();
    }

    // Stop Web Speech Recognition gracefully (do not wipe results before stopping)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Stop visualizer
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setAudioLevel(0);

    if (dictationTimerRef.current) {
      clearInterval(dictationTimerRef.current);
      dictationTimerRef.current = null;
    }

    // If live text was captured via real-time Web Speech API, send immediately with ZERO delay!
    const immediateText = (textToUse || liveTranscript || capturedTextRef.current || '').trim();
    if (immediateText) {
      stopAllMedia();
      setInputText('');
      setLiveTranscript('');
      capturedTextRef.current = '';
      const imgToSend = selectedImage;
      setSelectedImage(null);
      setSelectedImageName(null);
      const cleaned = cleanSpokenTranscript(immediateText) || immediateText;
      await onSendMessage(cleaned.trim(), imgToSend || undefined);
      return;
    }

    // If no text was captured in real-time (e.g. browser without Web Speech),
    // transcribe the recorded audio chunks with Gemini AI ultra-fast!
    if (!isOnline) {
      setIsTranscribingAudio(false);
      stopAllMedia();
      playCyberSound('alert');
      setMicErrorMessage('Transcription impossible hors ligne');
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsTranscribingAudio(true);

      mediaRecorderRef.current.onstop = async () => {
        try {
          if (!isOnline) {
            setIsTranscribingAudio(false);
            stopAllMedia();
            setMicErrorMessage('Transcription impossible hors ligne');
            return;
          }

          const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          if (audioBlob.size > 50) {
            const reader = new FileReader();
            reader.onerror = () => {
              setIsTranscribingAudio(false);
              stopAllMedia();
              setMicErrorMessage("Erreur lors de la lecture audio.");
            };
            reader.onload = async () => {
              try {
                if (!isOnline) {
                  throw new Error('Transcription impossible hors ligne');
                }

                const base64Data = reader.result as string;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 45000);

                const res = await fetch('/api/transcribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  signal: controller.signal,
                  body: JSON.stringify({
                    audioData: base64Data,
                    mimeType,
                    language: 'fr',
                  }),
                }).catch((fetchErr) => {
                  if (!isOnline) {
                    throw new Error('Transcription impossible hors ligne');
                  }
                  throw fetchErr;
                });
                clearTimeout(timeoutId);

                if (res.ok) {
                  const data = await res.json();
                  const transText = (data.transcription || '').trim();
                  const cleanTrans = cleanSpokenTranscript(transText) || transText;
                  if (cleanTrans) {
                    const finalCombined = base ? `${base} ${cleanTrans}` : cleanTrans;
                    setInputText('');
                    setLiveTranscript('');
                    capturedTextRef.current = '';
                    const imgToSend = selectedImage;
                    setSelectedImage(null);
                    setSelectedImageName(null);
                    await onSendMessage(finalCombined.trim(), imgToSend || undefined);
                  } else {
                    setMicErrorMessage("Aucune parole détectée dans l'enregistrement. Veuillez parler plus près du micro.");
                  }
                } else {
                  const errorData = await res.json().catch(() => ({}));
                  setMicErrorMessage(errorData.error || (isOnline ? "Impossible de transcrire l'enregistrement vocal." : "Transcription impossible hors ligne"));
                }
              } catch (err: any) {
                console.error('Erreur transcription rapide:', err);
                if (!isOnline || (err?.message && err.message.includes('hors ligne'))) {
                  setMicErrorMessage('Transcription impossible hors ligne');
                } else if (err?.name === 'AbortError') {
                  setMicErrorMessage("Délai de transcription dépassé (connexion lente). Veuillez réessayer.");
                } else {
                  setMicErrorMessage("Erreur lors de la transcription vocale. Veuillez réessayer.");
                }
              } finally {
                setIsTranscribingAudio(false);
                stopAllMedia();
              }
            };
            reader.readAsDataURL(audioBlob);
          } else {
            setIsTranscribingAudio(false);
            stopAllMedia();
            setMicErrorMessage("Enregistrement trop court.");
          }
        } catch (blobErr) {
          console.error('Erreur Blob audio:', blobErr);
          setIsTranscribingAudio(false);
          stopAllMedia();
        }
      };

      try {
        if (typeof mediaRecorderRef.current.requestData === 'function') {
          mediaRecorderRef.current.requestData();
        }
        mediaRecorderRef.current.stop();
      } catch (e) {
        setIsTranscribingAudio(false);
        stopAllMedia();
      }
    } else {
      stopAllMedia();
    }
  };

  const handleToggleDictation = () => {
    if (isDictating) {
      stopRecordingAndSend();
    } else {
      startRecording();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDictating) {
      stopRecordingAndSend();
      return;
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
                alt="Major2I.A" 
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
              <div className="flex items-center gap-2 text-xs text-[var(--fb-text-secondary)] leading-tight font-medium" id="chat-network-indicator">
                {effectiveIsOnline ? (
                  <span className="flex items-center gap-1 text-[var(--fb-green)]" id="chat-status-online">
                    <span className="w-2 h-2 rounded-full bg-[var(--fb-green)] animate-pulse inline-block" />
                    <span>{t('header.online') || 'En ligne'}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30" id="chat-status-offline">
                    <WifiOff className="w-3 h-3" />
                    <span>Mode Hors-ligne (Local)</span>
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
                  onClick={() => setInputText("Bonjour Major2I.A, aide-moi à...")}
                  className="flex-1 bg-[var(--fb-surface)]/60 hover:bg-[var(--fb-surface)]/90 text-[var(--fb-text-primary)] placeholder-[var(--fb-text-secondary)] text-sm sm:text-base px-4 py-2.5 rounded-full cursor-pointer transition-colors border border-[var(--fb-border-light)] font-medium"
                >
                  Que voulez-vous demander à l'IA, {userProfile?.prenom || userName} ?
                </div>
              </div>
            </div>

            {/* Dynamic News Feed "À la une" (France Info, 20 Minutes, BFMTV) */}
            <NewsHeadlineFeed onSelectPrompt={(prompt) => setInputText(prompt)} />
          </div>
        ) : (
          conversation.messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isFirstWelcomeMessage = idx === 0 && !isUser;
            return (
              <div key={idx} className="space-y-3 w-full">
                <div
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <img 
                      src="/maskable_icon.png" 
                      alt="Major2I.A" 
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
                        <span className="font-bold text-[var(--fb-text-primary)] text-sm">Major2I.A</span>
                        <Check className="w-3.5 h-3.5 text-[var(--fb-blue)]" />
                        <span className="text-xs text-[var(--fb-text-secondary)] font-medium flex items-center gap-1">
                          • {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          <Globe className="w-3 h-3 text-[var(--fb-text-muted)] ml-0.5 inline" />
                        </span>
                      </div>

                      {msg.offline && !effectiveIsOnline && (
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
                      <>
                        <div className="whitespace-pre-wrap">{msg.contenu}</div>
                        {/* User Bubble Actions (Copy / Coller & Time) */}
                        <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between gap-2 text-xs text-white/90">
                          <span className="text-[10px] text-white/70 font-mono">
                            {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setInputText((prev) => (prev ? `${prev}\n${msg.contenu}` : msg.contenu));
                                playCyberSound('beep');
                              }}
                              title="Coller dans le champ de saisie"
                              className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/25 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 text-sky-200" />
                              <span className="hidden sm:inline">Coller</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg.contenu, idx)}
                              title="Copier le message"
                              className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/25 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-300" />
                                  <span className="text-emerald-300 font-bold">Copié</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copier</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : !msg.contenu && isLoading && idx === conversation.messages.length - 1 ? (
                      <div className="flex items-center gap-2 text-sm text-[var(--fb-blue)] font-bold py-2">
                        <Loader2 className="w-4 h-4 text-[var(--fb-blue)] animate-spin" />
                        <span className="animate-pulse">Major2I.A génère votre réponse...</span>
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
                        onClick={() => exportItemToPDF('conversation', { titre: "Réponse Major2I.A", contenu: msg.contenu, date: msg.date })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--fb-surface)]/50 hover:text-[var(--fb-text-primary)] transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>

                      {onSaveToDestination && (
                        <button
                          type="button"
                          onClick={() => {
                            playCyberSound('click');
                            setSaveModalText(msg.contenu);
                            setSaveModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--fb-surface)]/50 text-[var(--fb-blue)] hover:text-[var(--fb-blue)] transition-colors cursor-pointer font-bold"
                          title="Enregistrer cette demande/réponse dans le module de votre choix (Favoris, Mémoire, Rappels, Tâches, Agenda)"
                        >
                          <BookmarkPlus className="w-4 h-4" />
                          <span>Enregistrer</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Timestamp for user bubbles */}
                  {isUser && (
                    <div className="mt-1 flex items-center justify-between text-[10px] text-white/90 font-medium">
                      {onSaveToDestination && (
                        <button
                          type="button"
                          onClick={() => {
                            playCyberSound('click');
                            setSaveModalText(msg.contenu);
                            setSaveModalOpen(true);
                          }}
                          className="flex items-center gap-1 opacity-80 hover:opacity-100 hover:underline cursor-pointer"
                          title="Enregistrer cette demande dans le module de votre choix"
                        >
                          <BookmarkPlus className="w-3 h-3" />
                          <span>Enregistrer</span>
                        </button>
                      )}
                      <span>
                        {new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-9 h-9 rounded-full bg-[var(--fb-blue)] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm mt-1 ring-1 ring-white/50">
                    {userProfile?.prenom ? userProfile.prenom[0].toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                )}
                </div>

                {/* Fil d'actualité présent à l'ouverture de l'application sous 'Bonjour et bienvenue ..' */}
                {isFirstWelcomeMessage && (
                  <div className="w-full pl-0 sm:pl-11 pt-1">
                    <NewsHeadlineFeed onSelectPrompt={(prompt) => setInputText(prompt)} />
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
              alt="Major2I.A" 
              className="w-9 h-9 rounded-full object-cover shrink-0 shadow-sm" 
            />
            <div className="p-3.5 rounded-2xl bg-[var(--chat-bubble-assistant)] backdrop-blur-xs border border-[var(--chat-bubble-border-ai)] flex items-center gap-2 text-xs font-bold text-[var(--fb-text-primary)] shadow-sm">
              <Loader2 className="w-4 h-4 text-[var(--fb-blue)] animate-spin" />
              <span>Major2I.A réfléchit et formule sa réponse...</span>
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

        {/* Live Audio Dictation Bar with instant send */}
        {isDictating && (
          <div className="p-3.5 rounded-2xl bg-[var(--fb-surface)]/95 backdrop-blur-md border-2 border-[var(--fb-red)] shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="w-3 h-3 rounded-full bg-[var(--fb-red)] animate-ping shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--fb-red)] text-xs sm:text-sm">Enregistrement vocal actif</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 text-[var(--fb-red)] font-mono font-bold">
                    {dictationSeconds}s
                  </span>
                </div>
                <div className="text-xs text-[var(--fb-text-primary)] font-medium truncate max-w-full mt-0.5">
                  {liveTranscript ? `"${liveTranscript}"` : "Parlez librement, votre message s'écrit en temps réel..."}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
              <div className="hidden sm:block w-20 h-2.5 bg-[var(--fb-surface-secondary)] rounded-full overflow-hidden border border-[var(--fb-border)]">
                <div 
                  className="h-full bg-[var(--fb-red)] transition-all duration-75"
                  style={{ width: `${Math.max(15, audioLevel)}%` }}
                />
              </div>

              {/* Instant Send Button */}
              <button
                type="button"
                onClick={() => stopRecordingAndSend()}
                className="px-4 py-2 bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] text-white rounded-full font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                title="Envoyer immédiatement le message complet au chatbot"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Envoyer maintenant</span>
              </button>

              {/* Stop / Cancel button */}
              <button
                type="button"
                onClick={() => {
                  isDictatingRef.current = false;
                  setIsDictating(false);
                  stopAllMedia();
                }}
                className="p-2 bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-secondary)] rounded-full text-xs font-semibold cursor-pointer transition-all"
                title="Arrêter la dictée sans envoyer"
              >
                <X className="w-4 h-4" />
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
          <div className="mt-2.5 px-3 py-1.5 bg-[var(--fb-surface-secondary)] border border-[var(--fb-border)] rounded-xl flex items-center gap-3 max-w-4xl mx-auto">
            <div className="relative w-9 h-9 rounded-lg border border-[var(--fb-border)] overflow-hidden bg-black">
              <img src={selectedImage} alt="Attachment" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(null);
                  setSelectedImageName(null);
                }}
                className="absolute top-0 right-0 bg-[var(--fb-red)] text-white p-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
            <span className="text-xs font-medium text-[var(--fb-text-primary)] truncate">{selectedImageName}</span>
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

      {/* Save to Chosen Destination Modal */}
      {onSaveToDestination && (
        <SaveToDestinationModal
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          messageText={saveModalText}
          onSave={onSaveToDestination}
        />
      )}
    </div>
  );
};
