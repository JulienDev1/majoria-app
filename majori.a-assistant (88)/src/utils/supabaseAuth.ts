import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Récupération des variables d'environnement Vite/React ou fallback local
const rawUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  (typeof window !== 'undefined' ? localStorage.getItem('neo-supabase-url') : '') || 
  '';

const rawKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  (typeof window !== 'undefined' ? localStorage.getItem('neo-supabase-key') : '') || 
  '';

// Assurer une URL et clé valides pour éviter le crash de createClient au chargement
const SUPABASE_URL = rawUrl.trim().startsWith('http') ? rawUrl.trim() : 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = rawKey.trim() || 'placeholder-anon-key';

export const isSupabaseConfigured = rawUrl.trim().startsWith('http') && Boolean(rawKey.trim());

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const VERCEL_PROD_URL = 'https://majoria-app.vercel.app';

/**
 * Retourne l'URL de redirection sécurisée pour l'authentification et Stripe.
 * Ne retourne JAMAIS http://localhost:3000 en dur.
 */
export function getAuthRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    if (!origin.includes('localhost:3000') && !origin.includes('127.0.0.1')) {
      return origin;
    }
  }
  return VERCEL_PROD_URL;
}

// Récupère le JWT valide pour chaque appel HTTP avec header x-user-id
export async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const headers: Record<string, string> = {};
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    const localUser = typeof window !== 'undefined' 
      ? (localStorage.getItem('user_id') || localStorage.getItem('neo-auth-user') || '') 
      : '';
    if (localUser) {
      headers['x-user-id'] = localUser;
    }
    return headers;
  } catch {
    return {};
  }
}
