import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabaseAdmin: SupabaseClient | null = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  } catch (err) {
    console.warn('Failed to init Supabase Admin in api/subscription:', err);
  }
}

let serverSupabase: SupabaseClient | null = null;
const supabaseKey = supabaseServiceKey || supabaseAnonKey;
if (supabaseUrl && supabaseKey) {
  try {
    serverSupabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.warn('Failed to init Supabase in api/subscription:', err);
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = await getUserIdFromRequest(req);
  const client = supabaseAdmin || serverSupabase;

  if (client) {
    try {
      const { data, error } = await client
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return res.status(200).json({
          subscription: {
            planId: data.plan_id,
            status: data.status,
            interval: data.interval || 'month',
            currentPeriodEnd: data.current_period_end,
            cancelAtPeriodEnd: data.cancel_at_period_end,
            stripeCustomerId: data.stripe_customer_id,
            stripeSubscriptionId: data.stripe_subscription_id,
          },
        });
      }
    } catch (err) {
      console.warn('Erreur Supabase dans api/subscription:', err);
    }
  }

  return res.status(200).json({ subscription: null });
}
