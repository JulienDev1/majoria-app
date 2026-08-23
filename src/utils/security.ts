// Security, Encryption, Storage, Voice & Audio helpers
import { AlertSound, VoiceGender } from '../types';

export const SENSITIVE_PATTERNS = [
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  /\b(?:\+33|0)[1-9](?:[ .-]?[0-9]{2}){4}\b/g,
  /\b(?:mot de passe|password|mdp|private_key|token|bearer)\s*[:=]\s*\S+/gi
];

export function getUserKey(): string {
  if (typeof window === 'undefined') return '';
  const user = localStorage.getItem('neo-auth-user') || '';
  const hash = localStorage.getItem('neo-auth-hash') || '';
  return user && hash ? `${user}:${hash}` : '';
}

export function obfuscate(str: string): string {
  if (!str) return '';
  try {
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
    return btoa(binString);
  } catch (e) {
    return str;
  }
}

export function deobfuscate(encoded: string): string {
  if (!encoded) return '';
  try {
    const binString = atob(encoded);
    const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return encoded;
  }
}

export function safeLoad<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const userKey = getUserKey();
    if (userKey && raw.startsWith('enc:')) {
      const decoded = deobfuscate(raw.replace('enc:', ''));
      return JSON.parse(decoded);
    }
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
}

export function safeSave<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  const userKey = getUserKey();
  const serialized = JSON.stringify(value);
  const payload = userKey ? `enc:${obfuscate(serialized)}` : serialized;
  localStorage.setItem(key, payload);
}

export function sanitizeConfidentialText(text: string): string {
  let sanitized = text || '';
  SENSITIVE_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '██████[CONFIDENTIEL]');
  });
  return sanitized;
}

/**
 * Modern Synthesized Alert Sounds generator using Web Audio API
 */
export function playAlertSound(soundType: AlertSound = 'zen-crystal') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (soundType === 'zen-crystal') {
      // Gentle warm crystal chime (Sine chords with soft exponential decay)
      const freqs = [587.33, 880.0, 1174.66]; // D5, A5, D6
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.06 / (idx + 1), now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 + idx * 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + 1.3 + idx * 0.1);
      });
    } else if (soundType === 'digital-pulse') {
      // Modern Futuristic Double Pulse (Triangle/Sine)
      [900, 1350].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = now + i * 0.1;
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.2, start + 0.08);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.12);
      });
    } else if (soundType === 'radar-harmonic') {
      // Subdued Sonar wave
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (soundType === 'celestial-bell') {
      // Melodic three-tone bell
      [523.25, 659.25, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.07, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.8);
      });
    } else {
      // soft-ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    // Audio autoplay restrictions catch
  }
}

// Specific Reminder Alarm Sound for scheduled deadlines
export function playReminderAlarmSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic double bell-chime + digital notification pulse
    const frequencies = [659.25, 880.0, 1318.51]; // E5, A5, E6
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const startTime = now + idx * 0.08;
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, startTime + 0.15);
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.9);
    });

    // Secondary reminder ring echo
    setTimeout(() => {
      try {
        const ctx2 = new AudioContextClass();
        const t2 = ctx2.currentTime;
        [880.0, 1318.51].forEach((freq, idx) => {
          const osc = ctx2.createOscillator();
          const gain = ctx2.createGain();
          osc.type = 'sine';
          const startTime = t2 + idx * 0.09;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.08, startTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.7);
          osc.connect(gain);
          gain.connect(ctx2.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.7);
        });
      } catch {}
    }, 280);
  } catch (e) {
    // Audio restrictions
  }
}

// Cyber Sound Effects generator using Web Audio API
export function playCyberSound(type: 'beep' | 'success' | 'alert' | 'matrix' | 'click') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'beep') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'alert') {
      const preferredAlert = (localStorage.getItem('neo-alert-sound') as AlertSound) || 'zen-crystal';
      playAlertSound(preferredAlert);
      return;
    } else if (type === 'matrix') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.3);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch (e) {
    // Ignore audio context autoplay restrictions
  }
}

// Text to Speech markdown cleaner
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    // Remove confidential markers
    .replace(/██████\[CONFIDENTIEL\]/g, ' ')
    // Remove URLs
    .replace(/https?:\/\/\S+/g, ' ')
    // Strip bold/italic markdown
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Remove ANY and ALL asterisks and hashes
    .replace(/[*#]+/g, ' ')
    // Strip bullet markers
    .replace(/^[\s]*[-+•]\s+/gm, ' ')
    // Strip numbered list markers
    .replace(/^[\s]*\d+\.\s+/gm, ' ')
    // Strip blockquotes
    .replace(/^>\s+/gm, ' ')
    // Strip horizontal rules
    .replace(/^[=\-_]{3,}\s*$/gm, ' ')
    // Strip tildes
    .replace(/~+/g, ' ')
    // Strip underscores and special symbols
    .replace(/_+/g, ' ')
    .replace(/[|\\/^{}[\]]/g, ' ')
    // Replace multiple spaces or newlines with a single space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Text-To-Speech with Male / Female voice customization
 */
export function speakCyberResponse(
  text: string, 
  voiceGenderOverride?: VoiceGender, 
  onEnd?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) {
    if (onEnd) onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'fr-FR';

  const gender: VoiceGender = 
    voiceGenderOverride || 
    (localStorage.getItem('neo-voice-gender') as VoiceGender) || 
    'female';

  const voices = window.speechSynthesis.getVoices();
  const frenchVoices = voices.filter((v) => v.lang.startsWith('fr'));

  if (gender === 'male') {
    // Select male voice or adapt pitch for male cadence
    utterance.pitch = 0.88;
    utterance.rate = 1.02;

    const maleVoice = frenchVoices.find((v) => 
      v.name.toLowerCase().includes('thomas') || 
      v.name.toLowerCase().includes('sebastien') || 
      v.name.toLowerCase().includes('nicolas') || 
      v.name.toLowerCase().includes('paul') || 
      v.name.toLowerCase().includes('male') || 
      v.name.toLowerCase().includes('homme')
    );
    if (maleVoice) {
      utterance.voice = maleVoice;
    } else if (frenchVoices.length > 0) {
      utterance.voice = frenchVoices[0];
    }
  } else {
    // Select female voice or soft natural pitch
    utterance.pitch = 1.15;
    utterance.rate = 1.04;

    const femaleVoice = frenchVoices.find((v) => 
      v.name.toLowerCase().includes('hortense') || 
      v.name.toLowerCase().includes('julie') || 
      v.name.toLowerCase().includes('denise') || 
      v.name.toLowerCase().includes('celine') || 
      v.name.toLowerCase().includes('female') || 
      v.name.toLowerCase().includes('femme') ||
      v.name.toLowerCase().includes('google français')
    );
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    } else if (frenchVoices.length > 0) {
      utterance.voice = frenchVoices[0];
    }
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}
