import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Video, 
  X, 
  RotateCw, 
  Circle, 
  Square, 
  Send, 
  Paperclip, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  Check, 
  Eye, 
  Zap,
  Upload
} from 'lucide-react';
import { playCyberSound } from '../utils/security';

interface CameraVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPhotoOrVideo: (prompt: string, imageDataUrl?: string) => void;
  onAttachImage: (imageDataUrl: string, name: string) => void;
}

type CaptureMode = 'photo' | 'video';

export const CameraVideoModal: React.FC<CameraVideoModalProps> = ({
  isOpen,
  onClose,
  onSendPhotoOrVideo,
  onAttachImage,
}) => {
  const [mode, setMode] = useState<CaptureMode>('photo');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Photo capture state
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoFlash, setPhotoFlash] = useState(false);

  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);

  // Analysis prompt input
  const [customPrompt, setCustomPrompt] = useState('');

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Check available cameras
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      })
      .catch(() => {});
  }, []);

  // Start Camera stream with clean constraints and robust user-gesture try/catch for Android & iOS
  const startCamera = useCallback(async (preferredFacing: 'user' | 'environment' = facingMode) => {
    setIsLoadingCamera(true);
    setCameraError(null);

    // Stop existing stream if any
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("L'accès à la caméra n'est pas supporté par ce navigateur.");
      }

      // Clean constraints object with facingMode: { ideal: 'environment' }
      const cleanConstraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: preferredFacing || 'environment' }
        },
        audio: mode === 'video'
      };

      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(cleanConstraints);
      } catch (primaryErr) {
        // Safe fallback without audio if audio permission failed
        const fallbackConstraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: preferredFacing || 'environment' }
          },
          audio: false
        };
        newStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Erreur démarrage caméra:', err);
      let msg = "Impossible d'accéder à la caméra.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Autorisation d'accès à la caméra refusée. Veuillez autoriser l'accès dans les paramètres de votre navigateur.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = "Aucun périphérique caméra détecté sur cet appareil.";
      } else if (err.name === 'NotReadableError') {
        msg = "La caméra est déjà utilisée par une autre application.";
      } else if (err.message) {
        msg = err.message;
      }
      setCameraError(msg);
    } finally {
      setIsLoadingCamera(false);
    }
  }, [facingMode, mode, stream]);

  // Direct user-click camera initialization handler with try/catch
  const handleUserStartCamera = () => {
    try {
      playCyberSound('click');
      startCamera(facingMode);
    } catch (e: any) {
      console.error('User click camera init error:', e);
      setCameraError(e?.message || "Erreur lors de l'activation de la caméra.");
    }
  };

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  }, [stream]);

  // Handle open/close modal lifecycle
  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      setRecordedVideoUrl(null);
      setRecordedVideoBlob(null);
      setIsRecording(false);
      setRecordingSeconds(0);
      setCustomPrompt('');
      // Attempt camera initialization safely
      try {
        startCamera(facingMode);
      } catch (err) {
        console.warn('Auto start camera prevented by browser policy, awaiting user click:', err);
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Toggle Camera (front/back) with user click
  const toggleFacingMode = () => {
    try {
      playCyberSound('click');
      const nextFacing = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(nextFacing);
      startCamera(nextFacing);
    } catch (err) {
      console.error('Toggle camera error:', err);
    }
  };

  // Capture Snapshot Photo
  const takePhoto = () => {
    if (!videoRef.current) return;
    playCyberSound('click');

    // Trigger flash animation
    setPhotoFlash(true);
    setTimeout(() => setPhotoFlash(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, flip horizontally for mirror effect match
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhoto(dataUrl);
    playCyberSound('success');
  };

  // Start Video Recording
  const startVideoRecording = () => {
    if (!stream) return;
    playCyberSound('click');
    recordedChunksRef.current = [];

    let options = { mimeType: 'video/webm;codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8,opus' };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/mp4' };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: '' };
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, options.mimeType ? options : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blobType = options.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: blobType });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideoBlob(blob);
        setRecordedVideoUrl(videoUrl);
        playCyberSound('success');
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e: any) {
      console.error('Erreur lancement enregistrement vidéo:', e);
      setCameraError("Impossible d'enregistrer la vidéo sur ce navigateur.");
    }
  };

  // Stop Video Recording
  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      playCyberSound('click');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  // Handle native camera fallback input
  const handleNativeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedPhoto(reader.result as string);
        playCyberSound('success');
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setRecordedVideoUrl(url);
      setRecordedVideoBlob(file);
      playCyberSound('success');
    }
  };

  // Send photo directly to Major2I.A with custom prompt
  const handleSendPhotoToMajorIA = () => {
    if (!capturedPhoto) return;
    playCyberSound('click');
    const prompt = customPrompt.trim() 
      ? customPrompt.trim() 
      : "Analyse cette photo capturée avec la caméra et décris en détail ce que tu observes, les textes visibles et les éléments clés.";
    onSendPhotoOrVideo(prompt, capturedPhoto);
    onClose();
  };

  // Attach photo to chat without sending immediately
  const handleAttachPhoto = () => {
    if (!capturedPhoto) return;
    playCyberSound('click');
    const filename = `photo-capture-${Date.now()}.jpg`;
    onAttachImage(capturedPhoto, filename);
    onClose();
  };

  // Send recorded video information / key frame to Major2I.A
  const handleSendVideoToMajorIA = () => {
    playCyberSound('click');
    // Extract thumbnail frame from video playback
    if (playbackVideoRef.current) {
      const vid = playbackVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = vid.videoWidth || 640;
      canvas.height = vid.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        const frameData = canvas.toDataURL('image/jpeg', 0.85);
        const prompt = customPrompt.trim()
          ? customPrompt.trim()
          : `[Vidéo enregistrée (${recordingSeconds}s)] Analyse cet extrait vidéo capturé par la caméra et apporte tes observations.`;
        onSendPhotoOrVideo(prompt, frameData);
        onClose();
        return;
      }
    }
    // Fallback without frame
    const prompt = customPrompt.trim()
      ? customPrompt.trim()
      : `[Vidéo enregistrée (${recordingSeconds}s)] J'ai enregistré une vidéo avec ma caméra.`;
    onSendPhotoOrVideo(prompt);
    onClose();
  };

  // Download captured photo
  const handleDownloadPhoto = () => {
    if (!capturedPhoto) return;
    const a = document.createElement('a');
    a.href = capturedPhoto;
    a.download = `majoria-photo-${Date.now()}.jpg`;
    a.click();
  };

  // Download recorded video
  const handleDownloadVideo = () => {
    if (!recordedVideoUrl) return;
    const a = document.createElement('a');
    a.href = recordedVideoUrl;
    a.download = `majoria-video-${Date.now()}.webm`;
    a.click();
  };

  // Format seconds to mm:ss
  const formatTime = (totalSec: number) => {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 animate-fadeIn">
      {/* Hidden Native Camera Input Fallback */}
      <input
        type="file"
        ref={nativeCameraInputRef}
        onChange={handleNativeFile}
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
      />

      <div className="relative w-full max-w-2xl bg-slate-950 border-2 border-sky-400/80 rounded-2xl sm:rounded-3xl shadow-[0_0_40px_rgba(56,189,248,0.3)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-gradient-to-r from-sky-950/90 via-slate-900/90 to-indigo-950/90 border-b border-white/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
              {mode === 'photo' ? <Camera className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>Appareil Photo / Vidéo</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40">
                  Major2I.A Vision
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {mode === 'photo' ? 'Capturez une image ou document pour analyse instantanée' : 'Enregistrez une séquence vidéo pour Major2I.A'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playCyberSound('click');
              onClose();
            }}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-rose-600/80 border border-white/20 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tab (Photo / Vidéo) */}
        {!capturedPhoto && !recordedVideoUrl && (
          <div className="px-4 py-2 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/20">
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  setMode('photo');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'photo'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Photo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  setMode('video');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'video'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Vidéo</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Native Mobile Camera fallback button */}
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                title="Utiliser l'appareil photo natif du smartphone"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/20 text-xs text-slate-200 hover:text-white transition-all active:scale-95"
              >
                <Upload className="w-3.5 h-3.5 text-sky-300" />
                <span className="hidden sm:inline">Caméra Système</span>
              </button>

              {/* Flip camera button */}
              <button
                type="button"
                onClick={toggleFacingMode}
                title="Changer de caméra (avant/arrière)"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/20 text-sky-300 hover:text-white transition-all active:scale-95"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Viewfinder / Preview Body */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] sm:min-h-[380px] overflow-hidden">
          
          {/* Flash animation on capture */}
          {photoFlash && (
            <div className="absolute inset-0 bg-white z-40 animate-ping opacity-90" />
          )}

          {/* 1. Live Camera Stream */}
          {!capturedPhoto && !recordedVideoUrl && (
            <div className="relative w-full h-full flex items-center justify-center">
              {isLoadingCamera && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 gap-3">
                  <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-sky-200">Initialisation de la caméra...</p>
                </div>
              )}

              {cameraError ? (
                <div className="p-6 text-center max-w-md flex flex-col items-center gap-3">
                  <div className="p-3 rounded-full bg-rose-500/20 border border-rose-500 text-rose-400">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-white">Accès Caméra Indisponible</h4>
                  <p className="text-xs sm:text-sm text-slate-300">{cameraError}</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    <button
                      onClick={handleUserStartCamera}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Réessayer</span>
                    </button>
                    <button
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Ouvrir Caméra Native</span>
                    </button>
                  </div>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover sm:object-contain max-h-[500px] ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  }`}
                />
              )}

              {/* Cyber HUD Overlay Grid & Crosshairs */}
              {!cameraError && !isLoadingCamera && (
                <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                  {/* Top HUD */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[11px] font-mono text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>LIVE HUD</span>
                    </div>

                    {isRecording && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/90 text-white text-xs font-mono font-bold animate-pulse shadow-lg">
                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                        <span>REC {formatTime(recordingSeconds)}</span>
                      </div>
                    )}
                  </div>

                  {/* Center Target Frame */}
                  <div className="self-center w-48 h-48 sm:w-64 sm:h-64 border border-white/20 rounded-2xl relative flex items-center justify-center">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-sky-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-sky-400" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-sky-400" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-sky-400" />
                    <div className="w-2 h-2 rounded-full bg-sky-400/60" />
                  </div>

                  {/* Bottom Guide */}
                  <div className="text-center">
                    <span className="text-[11px] font-mono text-slate-300 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                      {mode === 'photo' ? 'Cadrez l\'objet ou document et appuyez sur Déclencher' : 'Appuyez sur Enregistrer pour filmer'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Photo Preview After Capture */}
          {capturedPhoto && (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
              <img
                src={capturedPhoto}
                alt="Capture"
                className="w-full h-auto max-h-[380px] object-contain rounded-xl border border-white/30 shadow-2xl"
              />
              <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-sky-600/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
                <Check className="w-3.5 h-3.5" />
                <span>Photo capturée</span>
              </div>
            </div>
          )}

          {/* 3. Video Preview After Recording */}
          {recordedVideoUrl && (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
              <video
                ref={playbackVideoRef}
                src={recordedVideoUrl}
                controls
                playsInline
                className="w-full h-auto max-h-[380px] object-contain rounded-xl border border-white/30 shadow-2xl"
              />
              <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-rose-600/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
                <Video className="w-3.5 h-3.5" />
                <span>Vidéo ({formatTime(recordingSeconds)})</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-white/20 shrink-0 space-y-3">
          
          {/* Active Camera Trigger Buttons */}
          {!capturedPhoto && !recordedVideoUrl && (
            <div className="flex items-center justify-center gap-4">
              {mode === 'photo' ? (
                <button
                  type="button"
                  onClick={takePhoto}
                  disabled={!!cameraError || isLoadingCamera}
                  className="group relative flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-sky-500 via-blue-500 to-indigo-500 border-4 border-white shadow-[0_0_25px_rgba(56,189,248,0.7)] hover:shadow-[0_0_35px_rgba(56,189,248,1)] active:scale-90 transition-all cursor-pointer"
                  title="Prendre une photo"
                >
                  <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-white group-hover:scale-110 transition-transform" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={isRecording ? stopVideoRecording : startVideoRecording}
                  disabled={!!cameraError || isLoadingCamera}
                  className={`group relative flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 border-white active:scale-90 transition-all cursor-pointer ${
                    isRecording
                      ? 'bg-rose-600 shadow-[0_0_30px_rgba(225,29,72,0.9)] animate-pulse'
                      : 'bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 shadow-[0_0_25px_rgba(244,63,94,0.7)]'
                  }`}
                  title={isRecording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement vidéo"}
                >
                  {isRecording ? (
                    <Square className="w-6 h-6 text-white fill-current" />
                  ) : (
                    <Circle className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-current group-hover:scale-110 transition-transform" />
                  )}
                </button>
              )}
            </div>
          )}

          {/* Captured Result Actions & Analysis Options */}
          {(capturedPhoto || recordedVideoUrl) && (
            <div className="space-y-3">
              {/* Optional Prompt Field for Major2I.A */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={
                    capturedPhoto 
                      ? "Instruction pour Major2I.A (ex: 'Décris ce document', 'Résous cet exercice')..." 
                      : "Instruction pour Major2I.A sur cette vidéo..."
                  }
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full h-11 bg-slate-900 border border-sky-400/50 rounded-xl px-3.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Retake button */}
                  <button
                    type="button"
                    onClick={() => {
                      playCyberSound('click');
                      setCapturedPhoto(null);
                      setRecordedVideoUrl(null);
                      setRecordedVideoBlob(null);
                      startCamera();
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/20 text-xs font-semibold text-slate-200 hover:text-white transition-all active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reprendre</span>
                  </button>

                  {/* Download button */}
                  <button
                    type="button"
                    onClick={capturedPhoto ? handleDownloadPhoto : handleDownloadVideo}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/20 text-slate-200 hover:text-white transition-all active:scale-95"
                    title="Télécharger sur l'appareil"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Attach to Chat Input Button (for photo) */}
                  {capturedPhoto && (
                    <button
                      type="button"
                      onClick={handleAttachPhoto}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-sky-400/50 text-xs font-semibold text-sky-300 hover:text-white transition-all active:scale-95"
                      title="Joindre au message sans envoyer"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Joindre</span>
                    </button>
                  )}
                </div>

                {/* Primary Action: Send to Major2I.A */}
                <button
                  type="button"
                  onClick={capturedPhoto ? handleSendPhotoToMajorIA : handleSendVideoToMajorIA}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold border border-white shadow-[0_0_20px_rgba(56,189,248,0.5)] active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                  <span>Envoyer à Major2I.A</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
