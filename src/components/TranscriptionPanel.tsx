import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Upload,
  Copy,
  Check,
  Download,
  Trash2,
  Sparkles,
  MessageSquare,
  CheckSquare,
  Bell,
  Brain,
  Square,
  RefreshCw,
  Clock,
  FileText,
  Loader2
} from 'lucide-react';
import { TranscriptionItem } from '../types';
import { playCyberSound, safeLoad, safeSave } from '../utils/security';
import { cleanSpokenTranscript, mergeSpeechSegments } from '../utils/speechCleaner';

interface TranscriptionPanelProps {
  onSendToChat: (text: string) => void;
  onCreateTask: (titre: string) => void;
  onCreateReminder: (titre: string) => void;
  onCreateMemory: (text: string) => void;
  onShowToast: (message: string, type: 'info' | 'success' | 'warning' | 'danger') => void;
}

export const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  onSendToChat,
  onCreateTask,
  onCreateReminder,
  onCreateMemory,
  onShowToast
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('fr-FR');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [lastRecordedBlob, setLastRecordedBlob] = useState<Blob | null>(null);

  // History of transcriptions
  const [savedTranscriptions, setSavedTranscriptions] = useState<TranscriptionItem[]>(() => {
    return safeLoad<TranscriptionItem[]>('majoria-transcriptions', [
      {
        id: 1,
        titre: 'Note vocale réunion',
        texte: 'Validation des objectifs du trimestre et finalisation de la feuille de route produit.',
        dureeSecondes: 24,
        langue: 'fr-FR',
        date: new Date().toISOString()
      }
    ]);
  });

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const liveRecognizedRef = useRef<string>('');

  useEffect(() => {
    safeSave('majoria-transcriptions', savedTranscriptions);
  }, [savedTranscriptions]);

  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, []);

  const stopAllMedia = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
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
  };

  // Start / Stop Microphone Recording with Dual Engine (Web Speech + Gemini Audio Capture)
  const toggleRecording = async () => {
    if (isRecording) {
      await handleStopRecording();
    } else {
      await handleStartRecording();
    }
  };

  const handleStartRecording = async () => {
    try {
      playCyberSound('beep');
      liveRecognizedRef.current = '';
      audioChunksRef.current = [];
      setInterimText('');
      setRecordingDuration(0);
      setLastRecordedBlob(null);

      // 1. Request microphone access with progressive fallback
      let stream: MediaStream | null = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          });
        } catch (errConstraints) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (errBasic) {
            console.warn('getUserMedia audio: true failed:', errBasic);
          }
        }
      }

      streamRef.current = stream;

      // 2. Setup Audio Visualizer (Waveform meter) if stream is active
      if (stream) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            if (audioCtx.state === 'suspended') {
              audioCtx.resume().catch(() => {});
            }
            audioCtxRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateAudioLevel = () => {
              if (!streamRef.current) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(updateAudioLevel);
            };
            updateAudioLevel();
          }
        } catch (err) {
          console.warn('AudioContext not available:', err);
        }

        // 3. Setup MediaRecorder with mimeType detection
        try {
          let chosenMimeType = '';
          if (typeof MediaRecorder !== 'undefined') {
            const types = [
              'audio/webm;codecs=opus',
              'audio/webm',
              'audio/mp4',
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

          const mediaRecorder = chosenMimeType
            ? new MediaRecorder(stream, { mimeType: chosenMimeType })
            : new MediaRecorder(stream);

          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };

          mediaRecorder.start(250);
        } catch (err) {
          console.warn('MediaRecorder init error:', err);
        }
      }

      // 4. Setup Web Speech Recognition for immediate live dictation feedback
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognizer = new SpeechRecognition();
          recognizer.continuous = true;
          recognizer.interimResults = true;
          recognizer.lang = selectedLanguage || 'fr-FR';

          recognizer.onresult = (event: any) => {
            let currentInterim = '';
            let currentFinal = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const chunk = event.results[i][0]?.transcript || '';
              if (event.results[i].isFinal) {
                currentFinal = currentFinal ? mergeSpeechSegments(currentFinal, chunk) : chunk;
              } else {
                currentInterim = currentInterim ? mergeSpeechSegments(currentInterim, chunk) : chunk;
              }
            }

            if (currentFinal) {
              const clean = cleanSpokenTranscript(currentFinal);
              liveRecognizedRef.current = liveRecognizedRef.current 
                ? mergeSpeechSegments(liveRecognizedRef.current, clean) 
                : clean;
              setTranscribedText((prev) => (prev ? mergeSpeechSegments(prev, clean) : clean));
            }
            setInterimText(cleanSpokenTranscript(currentInterim));
          };

          recognizer.onerror = (event: any) => {
            console.warn('SpeechRecognition live error:', event.error);
          };

          recognizer.start();
          recognitionRef.current = recognizer;
        } catch (e) {
          console.warn('SpeechRecognition start error:', e);
        }
      }

      if (!stream && !recognitionRef.current) {
        throw new Error('Aucun système audio ou reconnaissance vocale disponible');
      }

      setIsRecording(true);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      onShowToast('Microphone actif • Parlez clairement', 'info');
    } catch (err: any) {
      console.error('Erreur accès micro:', err);
      playCyberSound('alert');
      onShowToast('Accès microphone refusé ou non supporté par le navigateur', 'danger');
      stopAllMedia();
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    playCyberSound('click');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);

    const hadLiveText = (liveRecognizedRef.current || interimText).trim();
    if (interimText.trim() && !liveRecognizedRef.current.includes(interimText.trim())) {
      setTranscribedText((prev) => (prev ? `${prev.trim()} ${interimText.trim()}` : interimText.trim()));
      setInterimText('');
    }

    // Stop MediaRecorder and trigger AI transcription if needed
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setLastRecordedBlob(audioBlob);

        // If Web Speech API didn't capture text or blob has voice data, transcribe via Gemini AI
        if (!hadLiveText && audioBlob.size > 200) {
          await transcribeBlobWithGemini(audioBlob, mimeType);
        } else if (hadLiveText) {
          onShowToast('Enregistrement terminé avec succès', 'success');
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      onShowToast('Enregistrement terminé', 'success');
    }
  };

  // Helper to transcribe an audio Blob via server-side Gemini API
  const transcribeBlobWithGemini = async (blob: Blob, mimeType: string) => {
    setIsProcessingAI(true);
    onShowToast('Transcription haute précision avec l\'IA en cours...', 'info');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioData: base64Data,
              mimeType,
              language: selectedLanguage === 'fr-FR' ? 'français' : 'anglais',
            }),
          });

          const data = await response.json();

          if (data.transcription && data.transcription.trim()) {
            const resultText = data.transcription.trim();
            setTranscribedText((prev) => (prev ? `${prev.trim()}\n\n${resultText}` : resultText));
            playCyberSound('success');
            onShowToast('Transcription IA terminée avec succès !', 'success');

            // Auto-save to history
            const newItem: TranscriptionItem = {
              id: Date.now(),
              titre: resultText.slice(0, 35) + (resultText.length > 35 ? '...' : ''),
              texte: resultText,
              dureeSecondes: recordingDuration || 10,
              langue: selectedLanguage,
              date: new Date().toISOString()
            };
            setSavedTranscriptions((prev) => [newItem, ...prev]);
          } else {
            throw new Error(data.error || 'Transcription vide');
          }
        } catch (err: any) {
          console.error('Erreur API Transcription:', err);
          onShowToast('Erreur lors du traitement de l\'enregistrement vocal', 'danger');
        } finally {
          setIsProcessingAI(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      setIsProcessingAI(false);
      onShowToast('Erreur lors de la lecture audio', 'danger');
    }
  };

  // Upload Audio File for AI Transcription
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      onShowToast('Fichier trop volumineux (max 25 Mo)', 'warning');
      return;
    }

    setIsUploading(true);
    playCyberSound('beep');
    onShowToast(`Transcription du fichier "${file.name}" en cours...`, 'info');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioData: base64Data,
              mimeType: file.type || 'audio/mp3',
              language: selectedLanguage === 'fr-FR' ? 'français' : 'anglais',
            }),
          });

          const data = await response.json();

          if (data.transcription) {
            const resultText = data.transcription;
            setTranscribedText((prev) => (prev ? `${prev}\n\n${resultText}` : resultText));
            playCyberSound('success');
            onShowToast('Fichier audio transcrit avec succès !', 'success');

            // Add to saved history
            const newItem: TranscriptionItem = {
              id: Date.now(),
              titre: file.name.replace(/\.[^/.]+$/, ''),
              texte: resultText,
              dureeSecondes: 0,
              langue: selectedLanguage,
              date: new Date().toISOString()
            };
            setSavedTranscriptions((prev) => [newItem, ...prev]);
          } else {
            throw new Error(data.error || 'Erreur transcription');
          }
        } catch (error: any) {
          console.error('Upload transcription error:', error);
          onShowToast('Erreur lors de la transcription du fichier audio', 'danger');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Upload error:', err);
      setIsUploading(false);
      onShowToast('Erreur lors du chargement du fichier audio', 'danger');
    }
    e.target.value = '';
  };

  const handleCopyText = () => {
    const fullText = (transcribedText + ' ' + interimText).trim();
    if (!fullText) return;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    playCyberSound('click');
    onShowToast('Texte copié dans le presse-papier', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveTranscription = () => {
    const fullText = (transcribedText + ' ' + interimText).trim();
    if (!fullText) return;

    const firstWords = fullText.slice(0, 35) + (fullText.length > 35 ? '...' : '');
    const newItem: TranscriptionItem = {
      id: Date.now(),
      titre: firstWords || 'Transcription Vocale',
      texte: fullText,
      dureeSecondes: recordingDuration,
      langue: selectedLanguage,
      date: new Date().toISOString()
    };
    setSavedTranscriptions([newItem, ...savedTranscriptions]);
    playCyberSound('success');
    onShowToast('Transcription enregistrée dans l\'historique', 'success');
  };

  const handleDownloadTxt = () => {
    const fullText = (transcribedText + ' ' + interimText).trim();
    if (!fullText) return;
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    playCyberSound('click');
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const wordsCount = (transcribedText + ' ' + interimText).trim().split(/\s+/).filter(Boolean).length;
  const charsCount = (transcribedText + ' ' + interimText).length;

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-transparent overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-sky-500/20 border border-white text-sky-400 shadow-sm">
              <Mic className="w-6 h-6" />
            </span>
            Transcription Vocale
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-1 font-medium">
            Activez le microphone pour transcrire votre voix en direct ou importez un fichier audio.
          </p>
        </div>

        {/* Language selector & File Upload button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isRecording}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white transition-colors shadow-sm"
          >
            <option value="fr-FR">Français (FR)</option>
            <option value="en-US">English (US)</option>
            <option value="es-ES">Español</option>
            <option value="de-DE">Deutsch</option>
            <option value="it-IT">Italiano</option>
          </select>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isRecording || isProcessingAI}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white text-white text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            {isUploading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-sky-300" />
            ) : (
              <Upload className="w-4 h-4 text-sky-300" />
            )}
            <span>{isUploading ? 'Transcription...' : 'Importer Audio'}</span>
          </button>
        </div>
      </div>

      {/* Main Recording / Dictation Card */}
      <div className="bg-slate-900/90 rounded-2xl border border-white p-5 sm:p-6 shadow-xl space-y-5">
        {/* Controls and Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-white">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button
              onClick={toggleRecording}
              disabled={isProcessingAI || isUploading}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex items-center justify-center transition-all shadow-lg active:scale-95 shrink-0 ${
                isRecording
                  ? 'bg-rose-600 border-white text-white animate-pulse ring-2 ring-rose-400'
                  : isProcessingAI
                  ? 'bg-slate-800 border-white text-sky-400 cursor-wait'
                  : 'bg-sky-600 hover:bg-sky-500 border-white text-white shadow-md'
              }`}
            >
              {isProcessingAI ? (
                <Loader2 className="w-7 h-7 animate-spin text-white" />
              ) : isRecording ? (
                <Square className="w-6 h-6 fill-white" />
              ) : (
                <Mic className="w-7 h-7" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {isRecording ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-rose-300">Microphone actif • Parlez</span>
                  </>
                ) : isProcessingAI ? (
                  <span className="text-sky-300">Traitement IA en cours...</span>
                ) : (
                  <span>Cliquez sur le micro pour enregistrer</span>
                )}
              </div>

              {/* Volume meter visualizer during recording */}
              {isRecording ? (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-3 bg-black rounded-full border border-white p-0.5 overflow-hidden max-w-xs">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-400 to-rose-500 transition-all duration-75"
                      style={{ width: `${Math.max(8, audioLevel)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-white">
                    {formatSeconds(recordingDuration)}
                  </span>
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-slate-300 flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 font-mono text-white">
                    <Clock className="w-3.5 h-3.5" />
                    {formatSeconds(recordingDuration)}
                  </span>
                  <span>•</span>
                  <span>{wordsCount} mots</span>
                  <span>•</span>
                  <span>{charsCount} caractères</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Clear / Reset & AI Retranscribe buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {lastRecordedBlob && !isRecording && (
              <button
                type="button"
                onClick={() => {
                  const mimeType = lastRecordedBlob.type || 'audio/webm';
                  transcribeBlobWithGemini(lastRecordedBlob, mimeType);
                }}
                disabled={isProcessingAI}
                className="px-3.5 py-2 rounded-xl bg-sky-600/40 hover:bg-sky-600/60 border border-white text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-sky-300" />
                <span>Améliorer avec l'IA</span>
              </button>
            )}

            {(transcribedText || interimText) && (
              <>
                <button
                  type="button"
                  onClick={handleSaveTranscription}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600/50 hover:bg-emerald-600/70 border border-white text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>Enregistrer</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTranscribedText('');
                    setInterimText('');
                    setRecordingDuration(0);
                    setLastRecordedBlob(null);
                    playCyberSound('click');
                  }}
                  className="p-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 border border-white text-rose-200 transition-all shadow-sm"
                  title="Effacer le texte"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live Textarea */}
        <div className="relative">
          <textarea
            value={transcribedText + (interimText ? ` ${interimText}` : '')}
            onChange={(e) => setTranscribedText(e.target.value)}
            placeholder="Le texte transcrit s'affichera ici en temps réel pendant que vous parlez dans le micro, ou après l'import d'un fichier audio..."
            rows={7}
            className="w-full bg-slate-950 border border-white focus:border-white rounded-xl p-4 text-white text-base sm:text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white font-sans leading-relaxed transition-all resize-y"
          />

          {isRecording && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1 bg-rose-950 border border-white rounded-lg text-white text-xs font-semibold shadow-md animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>Écoute active en direct</span>
            </div>
          )}

          {isProcessingAI && (
            <div className="absolute inset-0 bg-slate-950/90 rounded-xl flex items-center justify-center gap-3 backdrop-blur-sm border border-white">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
              <span className="text-white font-bold text-base">Transcription avec Gemini AI en cours...</span>
            </div>
          )}
        </div>

        {/* Action Toolbar on Transcribed Text */}
        {(transcribedText || interimText) && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Copy */}
              <button
                onClick={handleCopyText}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copié' : 'Copier'}</span>
              </button>

              {/* Download TXT */}
              <button
                onClick={handleDownloadTxt}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger (.txt)</span>
              </button>
            </div>

            {/* Smart Actions to other sections */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Send to Chat */}
              <button
                onClick={() => {
                  const text = (transcribedText + ' ' + interimText).trim();
                  if (text) onSendToChat(text);
                }}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 border border-white text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Envoyer au Chat</span>
              </button>

              {/* Create Task */}
              <button
                onClick={() => {
                  const text = (transcribedText + ' ' + interimText).trim();
                  if (text) {
                    onCreateTask(text.slice(0, 80));
                    onShowToast('Tâche créée à partir de la voix', 'success');
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-white text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Créer Tâche</span>
              </button>

              {/* Create Reminder */}
              <button
                onClick={() => {
                  const text = (transcribedText + ' ' + interimText).trim();
                  if (text) {
                    onCreateReminder(text.slice(0, 80));
                    onShowToast('Rappel créé à partir de la voix', 'success');
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 border border-white text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Bell className="w-4 h-4" />
                <span>Créer Rappel</span>
              </button>

              {/* Save to Memory */}
              <button
                onClick={() => {
                  const text = (transcribedText + ' ' + interimText).trim();
                  if (text) {
                    onCreateMemory(text);
                    onShowToast('Ajouté à la mémoire de MajorI.A', 'success');
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 border border-white text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Brain className="w-4 h-4" />
                <span>Mémoriser</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transcriptions History List */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-400" />
            Historique des Transcriptions ({savedTranscriptions.length})
          </h3>
        </div>

        {savedTranscriptions.length === 0 ? (
          <div className="text-center py-8 text-slate-300 bg-slate-900/80 rounded-2xl border border-white">
            Aucune transcription enregistrée pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedTranscriptions.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/90 rounded-2xl border border-white p-4 shadow-md hover:bg-slate-850 transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-white text-base truncate flex-1">{item.titre}</h4>
                    <span className="text-xs text-slate-300 shrink-0 font-mono">
                      {new Date(item.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-slate-200 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {item.texte}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTranscribedText(item.texte);
                        playCyberSound('click');
                        onShowToast('Transcription chargée dans l\'éditeur', 'info');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 border border-white text-white font-semibold transition-all"
                    >
                      Ouvrir
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.texte);
                        playCyberSound('click');
                        onShowToast('Copié dans le presse-papier', 'success');
                      }}
                      className="p-1.5 rounded-lg border border-white bg-slate-800 text-white hover:bg-slate-700 transition-all"
                      title="Copier"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSendToChat(item.texte)}
                      className="p-1.5 rounded-lg border border-white bg-sky-900/60 text-sky-200 hover:bg-sky-800 transition-all"
                      title="Envoyer au Chat"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSavedTranscriptions(savedTranscriptions.filter((t) => t.id !== item.id));
                      playCyberSound('alert');
                    }}
                    className="p-1.5 rounded-lg border border-white bg-rose-900/40 text-rose-300 hover:bg-rose-800 hover:text-white transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
