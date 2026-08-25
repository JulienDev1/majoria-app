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
 * Fully compatible with Mobile (iOS Safari, Android Chrome/Samsung) & Desktop
 */
export function speakCyberResponse(
  text: string, 
  voiceGenderOverride?: VoiceGender, 
  onEnd?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  // Cancel previous speech safely and unstick mobile synthesizer
  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (e) {}

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) {
    if (onEnd) onEnd();
    return;
  }

  const gender: VoiceGender = 
    voiceGenderOverride || 
    (localStorage.getItem('neo-voice-gender') as VoiceGender) || 
    'female';

  let hasSpoken = false;

  const selectAndSpeak = () => {
    if (hasSpoken) return;
    hasSpoken = true;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fr-FR';

      // CRITICAL MOBILE FIX: Prevent JavaScript engine garbage collection on iOS / Android
      (window as any).__majorIAActiveUtterance = utterance;

      const allVoices = window.speechSynthesis.getVoices() || [];
      const frenchVoices = allVoices.filter((v) => {
        const lang = (v.lang || '').toLowerCase();
        return lang.startsWith('fr') || lang.includes('french');
      });

      if (gender === 'male') {
        // Natural deeper masculine resonance
        utterance.pitch = 0.82;
        utterance.rate = 0.96;

        // Specific male voice matching
        const explicitMaleVoice = frenchVoices.find((v) => {
          const name = (v.name || '').toLowerCase();
          return name.includes('henri') ||
            name.includes('paul') ||
            name.includes('claude') ||
            name.includes('alain') ||
            name.includes('thomas') ||
            name.includes('nicolas') ||
            name.includes('mathieu') ||
            name.includes('pierre') ||
            name.includes('louis') ||
            name.includes('guy') ||
            name.includes('david') ||
            name.includes('antoine') ||
            name.includes('bernard') ||
            name.includes('male') ||
            name.includes('homme') ||
            name.includes('fr-fr-x-fra-network') ||
            name.includes('fr-fr-x-frc-network') ||
            name.includes('fr-fr-x-frd-network') ||
            name.includes('frc') ||
            name.includes('frd');
        });

        if (explicitMaleVoice) {
          utterance.voice = explicitMaleVoice;
        } else if (frenchVoices.length > 1) {
          // Choose non-default voice if available for variety
          utterance.voice = frenchVoices[1] || frenchVoices[0];
        } else if (frenchVoices.length > 0) {
          utterance.voice = frenchVoices[0];
        }
      } else {
        // Clear, melodic feminine voice settings
        utterance.pitch = 1.10;
        utterance.rate = 1.02;

        const femaleVoice = frenchVoices.find((v) => {
          const name = (v.name || '').toLowerCase();
          return name.includes('hortense') ||
            name.includes('julie') ||
            name.includes('denise') ||
            name.includes('celine') ||
            name.includes('céline') ||
            name.includes('audrey') ||
            name.includes('amelie') ||
            name.includes('amélie') ||
            name.includes('chantal') ||
            name.includes('alice') ||
            name.includes('virginie') ||
            name.includes('fra') ||
            name.includes('frb') ||
            name.includes('female') ||
            name.includes('femme') ||
            name.includes('google français');
        }) || frenchVoices[0];

        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }
      }

      const finishHandler = () => {
        (window as any).__majorIAActiveUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onend = finishHandler;
      utterance.onerror = finishHandler;

      // Resume in case mobile browser paused audio
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      (window as any).__majorIAActiveUtterance = null;
      if (onEnd) onEnd();
    }
  };

  const currentVoices = window.speechSynthesis.getVoices();
  if (currentVoices && currentVoices.length > 0) {
    selectAndSpeak();
  } else {
    // Listen for async voices on Android/Chrome
    window.speechSynthesis.onvoiceschanged = () => {
      selectAndSpeak();
      window.speechSynthesis.onvoiceschanged = null;
    };
    // Fast fallback timer for iOS Safari (which doesn't always trigger onvoiceschanged)
    setTimeout(() => {
      selectAndSpeak();
    }, 120);
  }
}
