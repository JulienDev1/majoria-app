import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getOrCreateUserId, setStoredUserId, getStoredUserId } from './userId';

export { getOrCreateUserId, setStoredUserId, getStoredUserId };

export interface UseCreditResult {
  success: boolean;
  balance: number | null;
  isExhausted: boolean;
  error?: string;
  source: 'server-proxy' | 'local-simulated';
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Client Supabase
export function getSupabaseClient(): SupabaseClient | null {
  return null;
}

// Récupération de la configuration Supabase stockée
export function getSupabaseConfig(): SupabaseConfig {
  if (typeof window === 'undefined') {
    return { url: '', anonKey: '' };
  }
  return {
    url: localStorage.getItem('neo-supabase-url') || '',
    anonKey: localStorage.getItem('neo-supabase-key') || '',
  };
}

// Sauvegarde de la configuration Supabase
export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('neo-supabase-url', url.trim());
    localStorage.setItem('neo-supabase-key', anonKey.trim());
  }
}

// Initialisation locale et vérification
export async function ensureUserCreditsRow(userId?: string, defaultCredits: number = 30): Promise<void> {
  const effectiveUserId = (userId && userId.trim()) || getOrCreateUserId();
  if (typeof window !== 'undefined') {
    const localKey = `neo-user-credits-${effectiveUserId}`;
    if (localStorage.getItem(localKey) === null) {
      localStorage.setItem(localKey, defaultCredits.toString());
    }
  }
}

// Consommation gérée avec contrôle local immédiat et synchronisation
export async function callUseCredit(userId?: string): Promise<UseCreditResult> {
  const effectiveUserId = (userId && userId.trim()) || getOrCreateUserId();
  
  if (typeof window !== 'undefined') {
    const localKey = `neo-user-credits-${effectiveUserId}`;
    const saved = localStorage.getItem(localKey) || localStorage.getItem('neo-battery-energy') || localStorage.getItem('neo-local-credits');
    const currentCredits = saved !== null ? parseInt(saved, 10) : 30;

    if (currentCredits <= 0) {
      return {
        success: false,
        balance: 0,
        isExhausted: true,
        source: 'local-simulated',
      };
    }

    const nextCredits = Math.max(0, currentCredits - 1);
    localStorage.setItem(localKey, nextCredits.toString());
    localStorage.setItem('neo-battery-energy', nextCredits.toString());
    localStorage.setItem('neo-local-credits', nextCredits.toString());

    return {
      success: true,
      balance: nextCredits,
      isExhausted: nextCredits <= 0,
      source: 'local-simulated',
    };
  }

  return {
    success: true,
    balance: 30,
    isExhausted: false,
    source: 'local-simulated',
  };
}

// Synchronisation vers le backend
export async function syncCreditsToSupabase(userId?: string, newCredits: number = 30): Promise<number> {
  const effectiveUserId = (userId && userId.trim()) || getOrCreateUserId();
  if (typeof window !== 'undefined') {
    localStorage.setItem(`neo-user-credits-${effectiveUserId}`, newCredits.toString());
    localStorage.setItem('neo-battery-energy', newCredits.toString());
    localStorage.setItem('neo-local-credits', newCredits.toString());
  }

  try {
    await fetch('/api/supabase/set-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: effectiveUserId, credits: newCredits }),
    });
  } catch (e) {
    console.warn('Erreur syncCreditsToSupabase:', e);
  }

  return newCredits;
}

// Récupération dynamique du solde de crédits depuis le backend / Supabase
export async function getCreditBalance(userId?: string): Promise<number | null> {
  const effectiveUserId = (userId && userId.trim()) || getOrCreateUserId();

  try {
    const res = await fetch(`/api/credits?user_id=${encodeURIComponent(effectiveUserId)}`);
    if (res.ok) {
      const data = await res.json();
      const credits = typeof data.credits === 'number' ? data.credits : (typeof data.balance === 'number' ? data.balance : null);
      if (credits !== null && typeof window !== 'undefined') {
        localStorage.setItem(`neo-user-credits-${effectiveUserId}`, credits.toString());
        localStorage.setItem('neo-battery-energy', credits.toString());
        localStorage.setItem('neo-local-credits', credits.toString());
        return credits;
      }
    }
  } catch (err) {
    console.warn('Erreur fetch getCreditBalance:', err);
  }

  // Fallback sur le cache local
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(`neo-user-credits-${effectiveUserId}`) || localStorage.getItem('neo-battery-energy');
    if (local !== null) {
      const parsed = parseInt(local, 10);
      if (!isNaN(parsed)) return parsed;
    }
  }

  return 30;
}
