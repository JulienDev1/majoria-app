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

// Récupère le JWT valide pour chaque appel HTTP
export async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return {};
    return { 'Authorization': `Bearer ${session.access_token}` };
  } catch {
    return {};
  }
}
