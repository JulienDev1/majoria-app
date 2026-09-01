import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration keys from environment variables or LocalStorage
const DEFAULT_SUPABASE_URL = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || 
  (typeof process !== 'undefined' && (process as any).env?.VITE_SUPABASE_URL) || 
  '';

const DEFAULT_SUPABASE_ANON_KEY = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || 
  (typeof process !== 'undefined' && (process as any).env?.VITE_SUPABASE_ANON_KEY) || 
  '';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Retrieve saved Supabase credentials from localStorage or environment
 */
export function getSupabaseConfig(): { url: string; anonKey: string } {
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('neo-supabase-url');
    const savedKey = localStorage.getItem('neo-supabase-anon-key');
    if (savedUrl && savedKey) {
      return { url: savedUrl.trim(), anonKey: savedKey.trim() };
    }
  }
  return {
    url: DEFAULT_SUPABASE_URL.trim(),
    anonKey: DEFAULT_SUPABASE_ANON_KEY.trim(),
  };
}

/**
 * Save custom Supabase credentials
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('neo-supabase-url', url.trim());
    localStorage.setItem('neo-supabase-anon-key', anonKey.trim());
    // Reset instance to re-create client on next call
    supabaseInstance = null;
  }
}

/**
 * Get or initialize the Supabase client
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.error('Erreur initialisation Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export interface UseCreditResult {
  success: boolean;
  balance: number | null;
  isExhausted: boolean;
  error?: string;
  source: 'supabase-rpc' | 'server-proxy' | 'local-simulated';
}

/**
 * Ensure a line exists in 'user_credits' table for the user before calling use_credit.
 * If the line does not exist, it inserts { user_id, credits: 30 }.
 */
export async function ensureUserCreditsRow(userId?: string, defaultCredits: number = 30) :Promise<void> {
  const effectiveUserId = (userId && userId.trim()) || 
    (typeof window !== 'undefined' && localStorage.getItem('neo-auto-user')) ||
    'anon_user';

  // 1. Initialisation dans le localStorage
  if (typeof window !== 'undefined') {
    const localKey = `neo-user-credits-${effectiveUserId}`;
    if (localStorage.getItem(localKey) === null) {
      localStorage.setItem(localKey, defaultCredits.toString());
    }
    if (localStorage.getItem('neo-local-credits') === null) {
      localStorage.setItem('neo-local-credits' , defaultCredits.toString());
    }
  }
}

/**
 * Core RPC caller: Calls 'use_credit' on Supabase.
 * - Avant d'appeler use_credit, vérifie si l'utilisateur a déjà une ligne dans user_credits.
 * - Si la fonction renvoie -1 : les crédits sont épuisés.
 * - Si la fonction renvoie un solde valide >= 0 : renvoie le solde.
 */
export async function callUseCredit(userId?: string): Promise<UseCreditResult> {
  const effectiveUserId = (userId && userId.trim()) ||
    (typeof window !== 'undefined' && localStorage.getItem('neo-auth-user')) ||
    'anon_user';

  try {
    const res = await fetch('/api/supabase/use-credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: effectiveUserId }),
    });

    if (!res.ok) {
      return { success: false, balance: null, isExhausted: false, source: 'server-proxy' };
    }

    const data = await res.json();
    return {
      success: true,
      balance: data.credits,
      isExhausted: data.credits <= 0,
      source: 'server-proxy'
    };
  } catch (err: any) {
    return { success: false, balance: null, isExhausted: false, source: 'server-proxy' };
  }
}

export async function getCreditBalance(userId?: string): Promise<number | null> {
  const effectiveUserId = (userId && userId.trim()) ||
    (typeof window !== 'undefined' && localStorage.getItem('neo-auth-user')) ||
    'anon_user';

  try {
    const res = await fetch(`/api/supabase/credits?userId=${encodeURIComponent(effectiveUserId)}`);
    if (res.ok) {
      const json = await res.json();
      if (typeof json.balance === 'number') {
        return json.balance;
      }
    }
  } catch {}

  const raw = typeof window !== 'undefined'
    ? (localStorage.getItem(`neo-user-credits-${effectiveUserId}`) || localStorage.getItem('neo-battery-energy') || localStorage.getItem('neo-local-credits'))
    : null;
  return raw !== null ? parseInt(raw, 10) : 30;
}

export async function syncCreditsToSupabase(userId?: string, newCredits: number = 100): Promise<number> {
  const effectiveUserId = (userId && userId.trim()) ||
    (typeof window !== 'undefined' && localStorage.getItem('neo-auth-user')) ||
    'user_default';

  // 1. Sauvegarde locale
  if (typeof window !== 'undefined') {
    localStorage.setItem('neo-battery-energy', newCredits.toString());
    localStorage.setItem('neo-local-credits', newCredits.toString());
    localStorage.setItem(`neo-user-credits-${effectiveUserId}`, newCredits.toString());
  }

  // 2. Synchro server
  try {
    await fetch('/api/supabase/set-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: effectiveUserId, credits: newCredits }),
    });
  } catch (apiErr) {
    console.warn('Synchro server échouée :', apiErr);
  }

  return newCredits;
}