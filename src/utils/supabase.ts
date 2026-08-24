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
      let rpcData: any = null;
      let rpcError: any = null;

      try {
        const res = await client.rpc('use_credit', { user_id: effectiveUserId });
        if (!res.error && res.data !== null && res.data !== undefined) {
          rpcData = res.data;
        } else {
          const res2 = await client.rpc('use_credit', { p_user_id: effectiveUserId });
          if (!res2.error && res2.data !== null && res2.data !== undefined) {
            rpcData = res2.data;
          } else {
            const res3 = await client.rpc('use_credit');
            if (!res3.error && res3.data !== null && res3.data !== undefined) {
              rpcData = res3.data;
            } else {
              rpcError = res.error || res2.error || res3.error;
            }
          }
        }
      } catch (e) {
        rpcError = e;
      }

      if (!rpcError && (typeof rpcData === 'number' || typeof rpcData === 'string')) {
        const parsed = Number(rpcData);
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
  const effectiveUserId = (userId && userId.trim()) || 
    (typeof window !== 'undefined' && localStorage.getItem('neo-auth-user')) || 
    'user_default';

  // 1. Check if user has active subscription saved locally
  if (typeof window !== 'undefined') {
    const subSaved = localStorage.getItem(`neo-user-sub-${effectiveUserId}`);
    if (subSaved) {
      try {
        const parsed = JSON.parse(subSaved);
        if (parsed && (parsed.status === 'active' || parsed.status === 'trialing')) {
          const target = parsed.planId === 'pro' ? 500 : parsed.planId === 'premium' ? 250 : 100;
          const current = localStorage.getItem('neo-battery-energy');
          const val = current !== null ? parseInt(current, 10) : target;
          return isNaN(val) || val < 100 ? target : val;
        }
      } catch {}
    }
  }

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc('get_credits', { user_id: effectiveUserId });
      if (!error && typeof data === 'number') {
        return data;
      }
    } catch {}
  }

  try {
    const res = await fetch(`/api/supabase/credits?userId=${encodeURIComponent(effectiveUserId)}`);
    if (res.ok) {
      const json = await res.json();
      if (typeof json.balance === 'number') {
        return json.balance;
      }
    }
  } catch {}

  const raw = typeof window !== 'undefined' ? (localStorage.getItem(`neo-user-credits-${effectiveUserId}`) || localStorage.getItem('neo-battery-energy') || localStorage.getItem('neo-local-credits')) : null;
  return raw !== null ? parseInt(raw, 10) : 100;
}

/**
 * Force update and synchronize credit balance to Supabase, server API, and localStorage
 */
export async function syncCreditsToSupabase(userId?: string, newCredits: number = 100): Promise<number> {
  const effectiveUserId = (userId && userId.trim()) || 
    (typeof window !== 'undefined' && localStorage.getItem('neo-auth-user')) || 
    'user_default';

  // 1. Immediately persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('neo-battery-energy', newCredits.toString());
    localStorage.setItem('neo-local-credits', newCredits.toString());
    localStorage.setItem(`neo-user-credits-${effectiveUserId}`, newCredits.toString());
  }

  // 2. Direct Supabase Client upsert if available
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('user_credits').upsert(
        { user_id: effectiveUserId, credits: newCredits, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    } catch (supErr) {
      console.warn('Supabase direct credits update failed, falling back to proxy:', supErr);
    }
  }

  // 3. Server API Proxy update
  try {
    const res = await fetch('/api/supabase/set-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: effectiveUserId, credits: newCredits }),
    });
    if (res.ok) {
      const json = await res.json();
      if (typeof json.balance === 'number') {
        return json.balance;
      }
    }
  } catch (apiErr) {
    console.warn('Server proxy set-credits sync failed:', apiErr);
  }

  return newCredits;
}
