import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabaseAdmin: SupabaseClient | null = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  } catch (err) {
    console.warn('Failed to init Supabase Admin in api/favoris:', err);
  }
}

let serverSupabase: SupabaseClient | null = null;
const supabaseKey = supabaseServiceKey || supabaseAnonKey;
if (supabaseUrl && supabaseKey) {
  try {
    serverSupabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.warn('Failed to init Supabase in api/favoris:', err);
  }
}

async function authenticateSupabaseUser(req: any): Promise<{ userId: string; userEmail: string; isSupabaseAuth: boolean }> {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const client = supabaseAdmin || serverSupabase;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ') && client) {
    const token = authHeader.replace('Bearer ', '').trim();
    try {
      const { data, error } = await client.auth.getUser(token);
      if (!error && data?.user) {
        return {
          userId: data.user.id,
          userEmail: data.user.email || `${data.user.id}@majoria.app`,
          isSupabaseAuth: true,
        };
      }
    } catch (err) {
      console.warn('Erreur vérification JWT Supabase:', err);
    }
  }
  return { userId: '', userEmail: '', isSupabaseAuth: false };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { userId, isSupabaseAuth } = await authenticateSupabaseUser(req);
  if (!isSupabaseAuth || !userId) {
    return res.status(401).json({ error: 'Non authentifié. Connexion requise.' });
  }

  const client = supabaseAdmin || serverSupabase;
  if (!client) {
    return res.status(500).json({ error: 'Base de données non configurée' });
  }

  const itemId = req.query?.id || req.body?.id;

  try {
    if (req.method === 'GET') {
      const { data, error } = await client
        .from('favoris')
        .select('*')
        .eq('user_id', userId)
        .order('date_creation', { ascending: false });

      if (error) {
        return res.status(200).json([]);
      }
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const item = {
        id: req.body?.id || Date.now(),
        titre: req.body?.titre || req.body?.nom || 'Favori',
        contenu: req.body?.contenu || req.body?.description || '',
        categorie: req.body?.categorie || 'général',
        date_creation: req.body?.date || req.body?.dateCreation || new Date().toISOString(),
        date: req.body?.date || new Date().toISOString(),
        user_id: userId,
        userId: userId
      };

      const { data, error } = await client
        .from('favoris')
        .upsert(item, { onConflict: 'id' })
        .select()
        .maybeSingle();

      return res.status(201).json(data || item);
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const idToUpdate = Number(itemId || req.query?.match?.[0]);
      const updateData = {
        ...req.body,
        user_id: userId
      };

      await client
        .from('favoris')
        .update(updateData)
        .eq('id', idToUpdate)
        .eq('user_id', userId);

      return res.status(200).json({ success: true, ...updateData, id: idToUpdate });
    }

    if (req.method === 'DELETE') {
      const idToDelete = Number(itemId || req.query?.match?.[0]);
      await client
        .from('favoris')
        .delete()
        .eq('id', idToDelete)
        .eq('user_id', userId);

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err: any) {
    console.error('Erreur /api/favoris:', err);
    return res.status(500).json({ error: err?.message || 'Erreur interne' });
  }
}
