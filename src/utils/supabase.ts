import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

// Initialisation locale sans requête réseau
export async function ensureUserCreditsRow(userId?: string, defaultCredits: number = 30): Promise<void> {
  if (typeof window !== 'undefined') {
    const effectiveUserId = (userId && userId.trim()) || localStorage.getItem('neo-auth-user') || 'user_default';
    const localKey = `neo-user-credits-${effectiveUserId}`;
    if (localStorage.getItem(localKey) === null) {
      localStorage.setItem(localKey, defaultCredits.toString());
    }
  }
}

// Consommation gérée localement par le frontend (le backend /api/chat fait le vrai contrôle)
export async function callUseCredit(userId?: string): Promise<UseCreditResult> {
  return {
    success: true,
    balance: 30,
    isExhausted: false,
    source: 'local-simulated'
  };
}

// Synchronisation
export async function syncCreditsToSupabase(userId?: string, newCredits: number = 100): Promise<number> {
  if (typeof window !== 'undefined') {
    const effectiveUserId = (userId && userId.trim()) || localStorage.getItem('neo-auth-user') || 'user_default';
    localStorage.setItem(`neo-user-credits-${effectiveUserId}`, newCredits.toString());
  }
  return newCredits;
}

// Solde
export async function getCreditBalance(userId?: string): Promise<number | null> {
  return 30;
}
