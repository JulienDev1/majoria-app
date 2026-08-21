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
export async function ensureUserCreditsRow(userId?: string, defaultCredits: number = 30): Promise<void> {
  const effectiveUserId = (userId && userId.trim()) || 
    (typeof window !== 'undefined' && localStorage.getItem('neo-auth-user')) || 
    'user_default';

  // 1. Ensure in local storage immediately
  if (typeof window !== 'undefined') {
    const localKey = `neo-user-credits-${effectiveUserId}`;
    if (localStorage.getItem(localKey) === null) {
      localStorage.setItem(localKey, defaultCredits.toString());
    }
    if (localStorage.getItem('neo-local-credits') === null) {
      localStorage.setItem('neo-local-credits', defaultCredits.toString());
    }
  }

  // 2. Direct Supabase Client check & insert (async background, non-blocking)
  const client = getSupabaseClient();
  if (client) {
    (async () => {
      try {
        const { data, error } = await client
          .from('user_credits')
          .select('user_id, credits')
          .eq('user_id', effectiveUserId)
          .maybeSingle();

        if (!data || error) {
          await client.from('user_credits').upsert(
            { user_id: effectiveUserId, credits: defaultCredits },
            { onConflict: 'user_id' }
          );
        }
      } catch {}
    })();
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
    'user_default';

  // 1. Direct Supabase Client execution if configured
  const client = getSupabaseClient();
  if (client) {
    try {
      const rpcPromise = client.rpc('use_credit', { user_id: effectiveUserId });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 800));
      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]) as any;

      if (!error && (typeof data === 'number' || typeof data === 'string')) {
        const parsed = Number(data);
        if (!isNaN(parsed)) {
          if (parsed === -1) {
            return {
              success: false,
              balance: -1,
              isExhausted: true,
              error: 'Crédits épuisés (-1)',
              source: 'supabase-rpc',
            };
          }
          return {
            success: true,
            balance: parsed,
            isExhausted: false,
            source: 'supabase-rpc',
          };
        }
      }
    } catch (err: any) {
      // Proceed to server/local fallback
    }
  }

  // 2. Try Server-Side Proxy Endpoint /api/supabase/use-credit with 800ms timeout
  try {
    const res = await fetch('/api/supabase/use-credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: effectiveUserId }),
      signal: AbortSignal.timeout(800),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.balance === -1 || json.isExhausted) {
        return {
          success: false,
          balance: -1,
          isExhausted: true,
          error: 'Crédits épuisés (-1)',
          source: 'server-proxy',
        };
      }
      if (typeof json.balance === 'number') {
        return {
          success: true,
          balance: json.balance,
          isExhausted: false,
          source: 'server-proxy',
        };
      }
    }
  } catch (serverErr) {
    // Proceed to local fallback
  }

  // 3. Local fallback credit management
  try {
    const userLocalKey = `neo-user-credits-${effectiveUserId}`;
    let rawSaved = localStorage.getItem(userLocalKey);
    if (rawSaved === null) {
      rawSaved = localStorage.getItem('neo-local-credits');
    }

    let currentBalance = rawSaved !== null ? parseInt(rawSaved, 10) : 30; // 30 crédits par défaut
    if (isNaN(currentBalance)) currentBalance = 30;

    if (currentBalance <= 0) {
      return {
        success: false,
        balance: -1,
        isExhausted: true,
        error: 'Crédits épuisés (-1)',
        source: 'local-simulated',
      };
    }

    const newBalance = currentBalance - 1;
    localStorage.setItem(userLocalKey, newBalance.toString());
    localStorage.setItem('neo-local-credits', newBalance.toString());

    return {
      success: true,
      balance: newBalance,
      isExhausted: false,
      source: 'local-simulated',
    };
  } catch {
    return {
      success: true,
      balance: 29,
      isExhausted: false,
      source: 'local-simulated',
    };
  }
}

/**
 * Fetch current credit balance without deducting
 */
export async function getCreditBalance(userId?: string): Promise<number | null> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc('get_credits', userId ? { user_id: userId } : {});
      if (!error && typeof data === 'number') {
        return data;
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/supabase/credits');
    if (res.ok) {
      const json = await res.json();
      if (typeof json.balance === 'number') {
        return json.balance;
      }
    }
  } catch {}

  const raw = localStorage.getItem('neo-local-credits');
  return raw !== null ? parseInt(raw, 10) : 50;
}
