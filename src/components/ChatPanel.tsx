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
  Battery
} from 'lucide-react';
import { Conversation, UserProfile, VoiceGender } from '../types';
import { playCyberSound, cleanTextForSpeech, speakCyberResponse } from '../utils/security';
import { exportItemToPDF } from '../utils/pdfExport';
import { CyberBrainHead } from './CyberBrainHead';
import { CameraVideoModal } from './CameraVideoModal';

interface ChatPanelProps {
  conversation: Conversation | null;
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
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  conversation,
  onSendMessage,
  onClearConversation,
  isLoading,
  user,
  userProfile,
  onOpenTranscription,
  voiceGender = 'female',
  energyPercent = 80,
  onOpenForfaits,
}) => {
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
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const baseInputTextRef = useRef<string>('');
  const capturedTextRef = useRef<string>('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, isLoading]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      stopAllMedia();
    };
  }, []);

  const stopAllMedia = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setAudioLevel(0);
    setIsDictating(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        setMicErrorMessage('Image trop volumineuse (maximum 5 Mo)');
        return;
      }
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
        const content = reader.result as string;
        setInputText((prev) => {
          const header = `[Fichier importé: ${file.name}]\n`;
          return prev ? `${prev}\n\n${header}${content}` : `${header}${content}`;
        });
        playCyberSound('success');
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  // Synchronous Start Dictation for user-gesture compliance
  const startRecording = () => {
    setMicErrorMessage(null);
    playCyberSound('beep');
    baseInputTextRef.current = inputText;
    capturedTextRef.current = '';
    setLiveTranscript('');
    audioChunksRef.current = [];
    setDictationSeconds(0);
    setIsDictating(true);

    // 1. Start SpeechRecognition SYNCHRONOUSLY to preserve user gesture context
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognizer = new SpeechRecognition();
        recognizer.continuous = true;
        recognizer.interimResults = true;
        recognizer.lang = 'fr-FR';

        recognizer.onresult = (event: any) => {
          let currentFinal = '';
          let currentInterim = '';

          for (let i = 0; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              currentFinal += event.results[i][0].transcript + ' ';
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          const combined = (currentFinal + currentInterim).trim();
          if (combined) {
            capturedTextRef.current = combined;
            setLiveTranscript(combined);
            const base = baseInputTextRef.current ? baseInputTextRef.current.trim() : '';
            setInputText(base ? `${base} ${combined}` : combined);
          }
        };

        recognizer.onerror = (event: any) => {
          console.warn('SpeechRecognition notice:', event.error);
          if (event.error === 'not-allowed') {
            setMicErrorMessage("Autorisation du micro refusée par le navigateur.");
          }
        };

        recognizer.start();
        recognitionRef.current = recognizer;
      } catch (err) {
        console.warn('SpeechRecognition error:', err);
      }
    }

    // 2. Start MediaStream & MediaRecorder concurrently
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          streamRef.current = stream;

          // Setup Audio Visualizer
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const audioCtx = new AudioCtx();
              if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
              }
              audioCtxRef.current = audioCtx;
              const analyser = audioCtx.createAnalyser();
              analyser.fftSize = 32;
              const source = audioCtx.createMediaStreamSource(stream);
              source.connect(analyser);

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const updateLevel = () => {
                if (!streamRef.current) return;
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
                animFrameRef.current = requestAnimationFrame(updateLevel);
              };
              updateLevel();
            }
          } catch (e) {}

          let mimeType = 'audio/webm';
          if (typeof MediaRecorder !== 'undefined') {
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
              mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
              mimeType = 'audio/mp4';
            }
          }

          const recorder = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          recorder.start(250);

          timerRef.current = setInterval(() => {
            setDictationSeconds((prev) => prev + 1);
          }, 1000);
        })
        .catch((err) => {
          console.warn('getUserMedia micro non disponible:', err);
          if (!recognitionRef.current) {
            setMicErrorMessage("Impossible d'accéder au microphone.");
            setIsDictating(false);
          }
        });
    }
  };

  const stopRecording = async () => {
    setIsDictating(false);
    playCyberSound('beep');

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Process audio recorded if recognition didn't yield text
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      const mime = recorder.mimeType || 'audio/webm';
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        audioChunksRef.current = [];
        if (!capturedTextRef.current && audioBlob.size > 1000) {
          setIsTranscribingAudio(true);
          try {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Data = reader.result as string;
              const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioData: base64Data, mimeType: mime }),
              });
              if (res.ok) {
                const data = await res.json();
                if (data.transcription) {
                  setInputText((prev) => {
                    const base = baseInputTextRef.current ? baseInputTextRef.current.trim() : '';
                    return base ? `${base} ${data.transcription}` : data.transcription;
                  });
                  playCyberSound('success');
                }
              }
              setIsTranscribingAudio(false);
            };
            reader.readAsDataURL(audioBlob);
          } catch (e) {
            setIsTranscribingAudio(false);
          }
        }
      };
      recorder.stop();
    }
  };

  const handleToggleDictation = () => {
    if (isDictating) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDictating) {
      await stopRecording();
    }
    const text = inputText.trim();
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

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#030914]/35 backdrop-blur-2xl relative overflow-hidden">
      
      {/* Header bar */}
      <div className="px-3 sm:px-5 py-2.5 bg-white/[0.03] backdrop-blur-xl border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <CyberBrainHead size={22} />
          <h2 className="font-bold text-white text-sm sm:text-base truncate">
            {conversation?.titre || `Discussion avec MajorI.A (${userName})`}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenTranscription && (
            <button
              onClick={() => {
                playCyberSound('click');
                onOpenTranscription();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 border-[0.5px] border-white/15 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Dictaphone</span>
            </button>
          )}

          <button
            onClick={() => {
              playCyberSound('alert');
              onClearConversation();
            }}
            title="Effacer la discussion"
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-950/60 border-[0.5px] border-white/15 text-slate-300 hover:text-rose-300 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
        {(!conversation || conversation.messages.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-lg mx-auto">
            <div className="relative p-4 rounded-3xl bg-white/[0.04] backdrop-blur-2xl border-[0.5px] border-white/20 shadow-2xl">
              <CyberBrainHead size={54} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                Bonjour {userProfile?.prenom ? userProfile.prenom : 'et bienvenue'} !
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Je suis MajorI.A, votre assistant intelligent. Posez-moi une question, dictez vocalement ou téléversez un document.
              </p>
            </div>

            {/* Starter Suggestion Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
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
                  className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border-[0.5px] border-white/15 text-left text-xs text-slate-200 transition-all cursor-pointer backdrop-blur-xl"
                >
                  <Sparkles className="w-3 h-3 text-sky-400 inline mr-1.5" />
                  <span>{promptText}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          conversation.messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-2.5 sm:gap-3.5 max-w-4xl mx-auto ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/[0.06] backdrop-blur-xl border-[0.5px] border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CyberBrainHead size={20} />
                  </div>
                )}

                <div
                  className={`relative p-3.5 sm:p-4 rounded-2xl border-[0.5px] backdrop-blur-xl max-w-[85%] sm:max-w-[78%] transition-all shadow-md ${
                    isUser
                      ? 'bg-sky-600/25 border-sky-400/40 text-white rounded-tr-none'
                      : 'bg-white/[0.05] border-white/15 text-slate-100 rounded-tl-none'
                  }`}
                >
                  {/* Message Image Attachment */}
                  {msg.image && (
                    <div className="mb-2.5 rounded-xl overflow-hidden border-[0.5px] border-white/20 max-w-xs">
                      <img src={msg.image} alt="Envoyé" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  {/* Message Text Content */}
                  <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words font-sans">
                    {msg.contenu}
                  </div>

                  {/* Grounded Google Search Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
                      <div className="text-[11px] font-bold text-sky-300 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span>Sources & Liens Google :</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-950/70 border-[0.5px] border-sky-400/40 text-[11px] text-sky-200 hover:text-white hover:bg-sky-900 transition-colors"
                          >
                            <span className="truncate max-w-[200px]">{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottom Message Actions */}
                  <div className="mt-2 pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-white/5">
                    <span>{new Date(msg.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyMessage(msg.contenu, idx)}
                        title="Copier"
                        className="p-1 hover:text-white transition-colors"
                      >
                        {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>

                      {!isUser && (
                        <button
                          onClick={() => handleSpeakMessage(msg.contenu, idx)}
                          title="Écouter le message"
                          className="p-1 hover:text-white transition-colors"
                        >
                          {speakingIndex === idx ? (
                            <VolumeX className="w-3 h-3 text-rose-400" />
                          ) : (
                            <Volume2 className="w-3 h-3 text-sky-300" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/[0.06] backdrop-blur-xl border-[0.5px] border-white/20 flex items-center justify-center shrink-0 mt-0.5 text-white text-xs font-bold">
                    {userProfile?.prenom ? userProfile.prenom[0].toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator with Animated Brain */}
        {isLoading && (
          <div className="flex gap-2.5 sm:gap-3.5 max-w-4xl mx-auto items-center">
            <div className="w-7 h-7 rounded-xl bg-white/[0.06] border-[0.5px] border-white/20 flex items-center justify-center shrink-0">
              <CyberBrainHead size={18} />
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.04] backdrop-blur-xl border-[0.5px] border-white/15 flex items-center gap-2 text-xs text-slate-300">
              <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
              <span>MajorI.A réfléchit et formule sa réponse...</span>
            </div>
          </div>
        )}

        {/* Mic error notice if any */}
        {micErrorMessage && (
          <div className="max-w-4xl mx-auto p-2.5 rounded-xl bg-rose-950/80 border-[0.5px] border-rose-400/50 text-rose-200 text-xs flex items-center justify-between">
            <span>{micErrorMessage}</span>
            <button onClick={() => setMicErrorMessage(null)} className="p-1 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live Audio Dictation Bar */}
        {isDictating && (
          <div className="max-w-4xl mx-auto p-3 rounded-2xl bg-rose-950/70 border-[0.5px] border-rose-400/60 backdrop-blur-xl flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping inline-block" />
              <div>
                <div className="font-bold text-white text-xs">Microphone actif ({dictationSeconds}s)</div>
                <div className="text-[11px] text-rose-200 truncate max-w-xs sm:max-w-md">
                  {liveTranscript ? `"${liveTranscript}"` : "Parlez maintenant..."}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-16 sm:w-24 h-2 bg-black/40 rounded-full overflow-hidden border-[0.5px] border-white/20">
                <div 
                  className="h-full bg-rose-400 transition-all duration-75"
                  style={{ width: `${Math.max(15, audioLevel)}%` }}
                />
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs border-[0.5px] border-white/30 flex items-center gap-1"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Terminer</span>
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bottom Bar (Glassmorphic & Transparent) */}
      <div className="p-3 sm:p-4 bg-[#030914]/50 border-t border-white/10 backdrop-blur-2xl shrink-0">
        
        {/* Exhausted Battery Notice Banner */}
        {effectiveEnergy <= 0 && (
          <div className="mb-2.5 p-2.5 rounded-xl bg-rose-950/80 border-[0.5px] border-rose-400/50 text-white flex items-center justify-between gap-3 max-w-6xl mx-auto shadow-md backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs">
              <BatteryWarning className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
              <span>Batterie IA déchargée (0% restant). Rechargez pour débloquer l'envoi.</span>
            </div>
            {onOpenForfaits && (
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  onOpenForfaits();
                }}
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white text-xs font-bold shrink-0 border-[0.5px] border-white/20"
              >
                Recharger
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2 sm:gap-2.5 max-w-6xl mx-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,.txt,.md,.json,.csv,.pdf"
            className="hidden"
          />

          {/* Main Text Input (Glassmorphic) */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={isDictating ? "Écoute en cours... Parlez maintenant !" : isTranscribingAudio ? "Transcription IA en cours..." : "Écrire à MajorI.A..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading || isTranscribingAudio}
              className={`w-full h-11 sm:h-12 bg-white/[0.04] backdrop-blur-xl border-[0.5px] border-white/20 rounded-xl px-3.5 sm:px-4 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 font-sans transition-all ${
                isDictating ? 'ring-1 ring-rose-400 bg-rose-950/20' : ''
              }`}
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage) || isLoading || isTranscribingAudio}
            className="h-11 px-3.5 sm:h-12 sm:px-4 rounded-xl bg-sky-600/80 hover:bg-sky-500 backdrop-blur-xl disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold border-[0.5px] border-white/30 transition-all shrink-0 flex items-center justify-center gap-1.5 active:scale-95 shadow-md cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-bold">Envoyer</span>
          </button>

          {/* Mic Button */}
          <button
            type="button"
            onClick={handleToggleDictation}
            disabled={isTranscribingAudio || isLoading}
            title={isDictating ? "Arrêter la dictée (Mic)" : "Activer la dictée vocale (Mic)"}
            className={`h-11 px-3 sm:h-12 sm:px-3.5 rounded-xl border-[0.5px] border-white/20 transition-all shrink-0 flex items-center justify-center gap-1.5 active:scale-95 shadow-md cursor-pointer backdrop-blur-xl ${
              isDictating
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-white/[0.05] hover:bg-white/[0.12] text-slate-100'
            }`}
          >
            {isTranscribingAudio ? (
              <Loader2 className="w-4 h-4 animate-spin text-sky-300" />
            ) : isDictating ? (
              <MicOff className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-rose-400" />
            )}
            <span className="text-xs font-semibold">
              {isTranscribingAudio ? 'Transcription...' : isDictating ? 'Écoute...' : 'Mic'}
            </span>
          </button>

          {/* Camera / Video Button */}
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              setIsCameraModalOpen(true);
            }}
            disabled={isLoading || isTranscribingAudio}
            title="Ouvrir l'appareil photo / vidéo (MajorI.A Vision)"
            className="h-11 px-3 sm:h-12 sm:px-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border-[0.5px] border-white/20 text-sky-300 hover:text-white transition-all shrink-0 flex items-center justify-center gap-1.5 active:scale-95 shadow-md cursor-pointer backdrop-blur-xl"
          >
            <Camera className="w-4 h-4 text-sky-300" />
            <span className="hidden sm:inline text-xs font-semibold">Photo/Vidéo</span>
          </button>
        </form>

        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="mt-2.5 px-3 py-1.5 bg-white/[0.04] border-[0.5px] border-white/20 rounded-xl flex items-center gap-3 max-w-6xl mx-auto backdrop-blur-xl">
            <div className="relative w-8 h-8 rounded-lg border-[0.5px] border-white/30 overflow-hidden bg-black">
              <img src={selectedImage} alt="Attachment" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(null);
                  setSelectedImageName(null);
                }}
                className="absolute top-0 right-0 bg-rose-600 text-white p-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
            <span className="text-xs font-medium text-slate-200 truncate">{selectedImageName}</span>
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
