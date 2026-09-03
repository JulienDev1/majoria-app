import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabaseAdmin: SupabaseClient | null = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  } catch (err) {
    console.warn('Failed to init Supabase Admin in api/rappels:', err);
  }
}

let serverSupabase: SupabaseClient | null = null;
const supabaseKey = supabaseServiceKey || supabaseAnonKey;
if (supabaseUrl && supabaseKey) {
  try {
    serverSupabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.warn('Failed to init Supabase in api/rappels:', err);
  }
}

async function getUserIdFromRequest(req: any): Promise<string> {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token) {
      const client = supabaseAdmin || serverSupabase;
      if (client) {
        try {
          const { data, error } = await client.auth.getUser(token);
          if (!error && data?.user?.id) {
            return data.user.id;
          }
        } catch {}
      }
    }
  }
  return req.query?.user_id || req.query?.userId || req.body?.user_id || req.body?.userId || 'anon_user';
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = await getUserIdFromRequest(req);
  const client = supabaseAdmin || serverSupabase;

  if (!client) {
    return res.status(200).json([]);
  }

  const itemId = req.query?.id || req.body?.id;

  try {
    if (req.method === 'GET') {
      const { data, error } = await client
        .from('rappels')
        .select('*')
        .eq('user_id', userId)
        .order('date_rappel', { ascending: true });

      if (error) {
        return res.status(200).json([]);
      }
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const item = {
        id: req.body?.id || Date.now(),
        titre: req.body?.titre || req.body?.nom || 'Nouveau rappel',
        description: req.body?.description || '',
        date_rappel: req.body?.dateRappel || req.body?.date_rappel || new Date().toISOString().split('T')[0],
        dateRappel: req.body?.dateRappel || req.body?.date_rappel || new Date().toISOString().split('T')[0],
        heure: req.body?.heure || '12:00',
        priorite: req.body?.priorite || 'normale',
        statut: req.body?.statut || 'actif',
        user_id: userId,
        userId: userId,
        date_creation: req.body?.dateCreation || new Date().toISOString(),
        dateCreation: req.body?.dateCreation || new Date().toISOString()
      };

      const { data, error } = await client
        .from('rappels')
        .upsert(item, { onConflict: 'id' })
        .select()
        .maybeSingle();

      return res.status(201).json(data || item);
    }

    if (req.method === 'PUT') {
      const idToUpdate = Number(itemId || req.query?.match?.[0]);
      const updateData = {
        ...req.body,
        user_id: userId
      };

      await client
        .from('rappels')
        .update(updateData)
        .eq('id', idToUpdate)
        .eq('user_id', userId);

      return res.status(200).json({ success: true, ...updateData, id: idToUpdate });
    }

    if (req.method === 'DELETE') {
      const idToDelete = Number(itemId || req.query?.match?.[0]);
      await client
        .from('rappels')
        .delete()
        .eq('id', idToDelete)
        .eq('user_id', userId);

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err: any) {
    console.error('Erreur /api/rappels:', err);
    return res.status(500).json({ error: err?.message || 'Erreur interne' });
  }
}
