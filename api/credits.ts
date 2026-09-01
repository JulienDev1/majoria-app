import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabaseAdmin: SupabaseClient | null = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  } catch (err) {
    console.warn('Failed to init Supabase Admin in api/credits:', err);
  }
}

let serverSupabase: SupabaseClient | null = null;
const supabaseKey = supabaseServiceKey || supabaseAnonKey;
if (supabaseUrl && supabaseKey) {
  try {
    serverSupabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.warn('Failed to init Supabase in api/credits:', err);
  }
}

const memoryCredits: Record<string, number> = {};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const userId = req.query?.user_id || req.query?.userId || req.body?.user_id || req.body?.userId || 'anon_user';
  const client = supabaseAdmin || serverSupabase;

  if (client) {
    try {
      // 1. Vérifier si un abonnement est actif
      const { data: subRow } = await client
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subRow && (subRow.status === 'active' || subRow.status === 'trialing')) {
        const planEnergy = subRow.plan_id === 'pro' ? 500 : subRow.plan_id === 'premium' ? 250 : 100;
        return res.status(200).json({
          success: true,
          credits: planEnergy,
          balance: planEnergy,
          maxCredits: planEnergy,
          percentage: 100,
          plan: subRow.plan_id,
        });
      }

      // 2. Vérifier la table user_credits
      const { data: userRow } = await client
        .from('user_credits')
        .select('credits, credits_used')
        .eq('user_id', userId)
        .maybeSingle();

      if (userRow && typeof userRow.credits === 'number') {
        const credits = userRow.credits;
        const maxCredits = 30;
        const percentage = Math.min(100, Math.max(0, Math.round((credits / maxCredits) * 100)));
        return res.status(200).json({
          success: true,
          credits,
          balance: credits,
          maxCredits,
          percentage,
          credits_used: userRow.credits_used || 0,
        });
      }

      // Si l'utilisateur n'existe pas encore, insérer la ligne initiale avec 30 crédits
      await client.from('user_credits').upsert(
        {
          user_id: userId,
          credits: 30,
          credits_used: 0,
          plan: 'free',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      return res.status(200).json({
        success: true,
        credits: 30,
        balance: 30,
        maxCredits: 30,
        percentage: 100,
        credits_used: 0,
      });
    } catch (err) {
      console.warn('Erreur Supabase dans api/credits:', err);
    }
  }

  if (memoryCredits[userId] === undefined) {
    memoryCredits[userId] = 30;
  }

  const credits = memoryCredits[userId];
  const maxCredits = 30;
  const percentage = Math.min(100, Math.max(0, Math.round((credits / maxCredits) * 100)));

  return res.status(200).json({
    success: true,
    credits,
    balance: credits,
    maxCredits,
    percentage,
  });
}
