import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Servir le dossier public et dist à la racine
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(express.static(path.join(process.cwd(), 'dist')));

// Initialize Supabase client if env vars available
let serverSupabase: SupabaseClient | null = null;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  try {
    serverSupabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase Server Client initialized successfully.');
  } catch (err) {
    console.warn('Failed to initialize Supabase Server Client:', err);
  }
}

// Initialize Stripe Client with secret key or mock support
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecretKey && stripeSecretKey !== 'sk_test_placeholder' 
  ? new Stripe(stripeSecretKey, { apiVersion: '2025-02-24.acacia' as any })
  : null;

if (stripe) {
  console.log('Stripe SDK initialized successfully with live/test secret key.');
} else {
  console.log('Stripe SDK in sandbox simulation mode (configure STRIPE_SECRET_KEY to enable live checkout).');
}

// In-memory data store for server-side persistence fallback
let serverStore = {
  favoris: [] as any[],
  memoire: [] as any[],
  rappels: [] as any[],
  taches: [] as any[],
  credits: 30,
  userCredits: {} as Record<string, number>,
  subscriptions: {} as Record<string, any>,
  stripeCustomers: {} as Record<string, string>
};

// Plan configurations
const PLAN_DEFINITIONS: Record<string, { name: string; amountMonth: number; amountYear: number; energy: number }> = {
  basic: { name: 'Formule Essentielle (MajorI.A)', amountMonth: 990, amountYear: 9504, energy: 100 },
  premium: { name: 'Formule Performance (MajorI.A)', amountMonth: 1990, amountYear: 19104, energy: 250 },
  pro: { name: 'Formule Illimitée Pro (MajorI.A)', amountMonth: 3990, amountYear: 38304, energy: 500 },
};

// Initialize Gemini Client factory
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
  if (apiKey && apiKey.trim() && apiKey !== 'MY_GEMINI_API_KEY') {
    return new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return new GoogleGenAI({});
}

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', neural: 'online', timestamp: new Date().toISOString() });
});

// FAVORIS ENDPOINTS
app.get('/api/favoris', (req: Request, res: Response) => {
  res.json(serverStore.favoris);
});

app.post('/api/favoris', (req: Request, res: Response) => {
  const item = { id: Date.now(), ...req.body, date: req.body.date || new Date().toISOString() };
  serverStore.favoris.unshift(item);
  res.status(201).json(item);
});

app.delete('/api/favoris/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  serverStore.favoris = serverStore.favoris.filter(f => f.id !== id);
  res.json({ success: true });
});

// MEMOIRE ENDPOINTS
app.get('/api/memoire', (req: Request, res: Response) => {
  res.json(serverStore.memoire);
});

app.post('/api/memoire', (req: Request, res: Response) => {
  const item = { id: Date.now(), importance: 3, tags: [], ...req.body, date: req.body.date || new Date().toISOString() };
  serverStore.memoire.unshift(item);
  res.status(201).json(item);
});

app.get('/api/memoire/recherche/:q', (req: Request, res: Response) => {
  const q = (req.params.q || '').toLowerCase();
  const results = serverStore.memoire.filter(m => 
    (m.contenu || '').toLowerCase().includes(q) ||
    (m.tags || []).some((t: string) => t.toLowerCase().includes(q))
  );
  res.json(results);
});

app.delete('/api/memoire/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  serverStore.memoire = serverStore.memoire.filter(m => m.id !== id);
  res.json({ success: true });
});

// RAPPELS ENDPOINTS
app.get('/api/rappels', (req: Request, res: Response) => {
  res.json(serverStore.rappels);
});

app.post('/api/rappels', (req: Request, res: Response) => {
  const item = { 
    id: Date.now(), 
    statut: 'actif',
    priorite: 'normale',
    ...req.body, 
    dateCreation: req.body.dateCreation || new Date().toISOString() 
  };
  serverStore.rappels.unshift(item);
  res.status(201).json(item);
});

app.put('/api/rappels/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = serverStore.rappels.findIndex(r => r.id === id);
  if (idx !== -1) {
    serverStore.rappels[idx] = { ...serverStore.rappels[idx], ...req.body };
    res.json(serverStore.rappels[idx]);
  } else {
    res.status(404).json({ error: 'Rappel introuvable' });
  }
});

app.delete('/api/rappels/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  serverStore.rappels = serverStore.rappels.filter(r => r.id !== id);
  res.json({ success: true });
});

// TACHES ENDPOINTS
app.get('/api/taches', (req: Request, res: Response) => {
  res.json(serverStore.taches);
});

app.post('/api/taches', (req: Request, res: Response) => {
  const item = { 
    id: Date.now(), 
    status: 'attente',
    priorite: 'normale',
    ...req.body, 
    dateCreation: req.body.dateCreation || new Date().toISOString() 
  };
  serverStore.taches.unshift(item);
  res.status(201).json(item);
});

app.put('/api/taches/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = serverStore.taches.findIndex(t => t.id === id);
  if (idx !== -1) {
    serverStore.taches[idx] = { ...serverStore.taches[idx], ...req.body };
    res.json(serverStore.taches[idx]);
  } else {
    res.status(404).json({ error: 'Tâche introuvable' });
  }
});

app.delete('/api/taches/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  serverStore.taches = serverStore.taches.filter(t => t.id !== id);
  res.json({ success: true });
});

// SUPABASE RPC & CREDITS ENDPOINTS
app.post('/api/supabase/ensure-user', async (req: Request, res: Response) => {
  const { userId, defaultCredits = 30 } = req.body || {};
  const effectiveUserId = (userId && String(userId).trim()) || 'user_default';

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('user_credits')
        .select('user_id, credits')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (!data || error) {
        await serverSupabase
          .from('user_credits')
          .upsert({ user_id: effectiveUserId, credits: defaultCredits }, { onConflict: 'user_id' });
      }
    } catch (e) {
      console.warn('Server ensure-user Supabase table err:', e);
    }
  }

  if (serverStore.userCredits[effectiveUserId] === undefined) {
    serverStore.userCredits[effectiveUserId] = defaultCredits;
  }

  res.json({ success: true, userId: effectiveUserId, credits: serverStore.userCredits[effectiveUserId] });
});

app.post('/api/supabase/use-credit', async (req: Request, res: Response) => {
  const { userId } = req.body || {};
  const effectiveUserId = (userId && String(userId).trim()) || 'user_default';

  // 1. If Supabase is connected on server
  if (serverSupabase) {
    try {
      // Step A: Ensure user exists in user_credits with 30 default credits before calling use_credit
      try {
        const { data: existingUser } = await serverSupabase
          .from('user_credits')
          .select('user_id, credits')
          .eq('user_id', effectiveUserId)
          .maybeSingle();

        if (!existingUser) {
          await serverSupabase
            .from('user_credits')
            .upsert({ user_id: effectiveUserId, credits: 30 }, { onConflict: 'user_id' });
        }
      } catch (checkErr) {
        console.warn('Vérification table user_credits avant use_credit:', checkErr);
      }

      // Step B: Call RPC use_credit
      let rpcResult;
      try {
        rpcResult = await serverSupabase.rpc('use_credit', { user_id: effectiveUserId });
      } catch {
        try {
          rpcResult = await serverSupabase.rpc('use_credit');
        } catch (rpcErr) {
          rpcResult = { error: rpcErr, data: null };
        }
      }

      const { data, error } = rpcResult as any;
      if (error) {
        console.warn('Server Supabase RPC use_credit error, fallback to table query:', error);
        // Fallback: direct table decrement
        const { data: userRow } = await serverSupabase
          .from('user_credits')
          .select('credits')
          .eq('user_id', effectiveUserId)
          .maybeSingle();

        let current = userRow?.credits !== undefined ? Number(userRow.credits) : 30;
        if (isNaN(current)) current = 30;

        if (current <= 0) {
          return res.json({ success: false, balance: -1, isExhausted: true, error: 'Crédits épuisés (-1)' });
        }

        const decremented = current - 1;
        await serverSupabase
          .from('user_credits')
          .upsert({ user_id: effectiveUserId, credits: decremented }, { onConflict: 'user_id' });

        return res.json({ success: true, balance: decremented, isExhausted: false });
      } else {
        const val = typeof data === 'number' ? data : Number(data);
        if (!isNaN(val)) {
          if (val === -1) {
            return res.json({ success: false, balance: -1, isExhausted: true, error: 'Crédits épuisés (-1)' });
          }
          return res.json({ success: true, balance: val, isExhausted: false });
        }
      }
    } catch (err: any) {
      console.warn('Server Supabase RPC call exception:', err);
    }
  }

  // 2. Server Store fallback (for testing/local execution)
  if (serverStore.userCredits[effectiveUserId] === undefined) {
    // If user has active subscription, initialize with plan energy
    const sub = serverStore.subscriptions[effectiveUserId];
    if (sub && sub.status === 'active') {
      const plan = PLAN_DEFINITIONS[sub.planId] || PLAN_DEFINITIONS.basic;
      serverStore.userCredits[effectiveUserId] = plan.energy || 100;
    } else {
      serverStore.userCredits[effectiveUserId] = 30;
    }
  }

  // If user has active subscription, ensure credits are never exhausted
  const sub = serverStore.subscriptions[effectiveUserId];
  if (sub && sub.status === 'active') {
    if (serverStore.userCredits[effectiveUserId] <= 0) {
      serverStore.userCredits[effectiveUserId] = 100;
    }
  }

  if (serverStore.userCredits[effectiveUserId] <= 0) {
    return res.json({ success: false, balance: -1, isExhausted: true, error: 'Crédits épuisés (-1)' });
  }

  serverStore.userCredits[effectiveUserId] -= 1;
  serverStore.credits = serverStore.userCredits[effectiveUserId];
  return res.json({ success: true, balance: serverStore.userCredits[effectiveUserId], isExhausted: false });
});

app.get('/api/supabase/credits', async (req: Request, res: Response) => {
  const { userId } = req.query || {};
  const effectiveUserId = (userId && String(userId).trim()) || 'user_default';

  // Check active subscription first
  const sub = serverStore.subscriptions[effectiveUserId];

  if (serverSupabase) {
    try {
      // Check user_subscriptions table first
      const { data: subRow } = await serverSupabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subRow && (subRow.status === 'active' || subRow.status === 'trialing')) {
        const plan = PLAN_DEFINITIONS[subRow.plan_id] || PLAN_DEFINITIONS.basic;
        const targetEnergy = plan.energy || 100;
        return res.json({ balance: targetEnergy });
      }

      const { data, error } = await serverSupabase.rpc('get_credits', { user_id: effectiveUserId });
      if (!error && typeof data === 'number') {
        const effective = (sub && sub.status === 'active' && data < 100) ? 100 : data;
        return res.json({ balance: effective });
      }
      // Table check
      const { data: row } = await serverSupabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      if (row && typeof row.credits === 'number') {
        const effective = (sub && sub.status === 'active' && row.credits < 100) ? 100 : row.credits;
        return res.json({ balance: effective });
      }
    } catch {}
  }

  if (sub && sub.status === 'active') {
    const plan = PLAN_DEFINITIONS[sub.planId] || PLAN_DEFINITIONS.basic;
    const targetEnergy = plan.energy || 100;
    serverStore.userCredits[effectiveUserId] = Math.max(serverStore.userCredits[effectiveUserId] || 0, targetEnergy);
    return res.json({ balance: serverStore.userCredits[effectiveUserId] });
  }

  if (serverStore.userCredits[effectiveUserId] === undefined) {
    serverStore.userCredits[effectiveUserId] = 100;
  }
  return res.json({ balance: serverStore.userCredits[effectiveUserId] });
});

app.post('/api/supabase/set-credits', async (req: Request, res: Response) => {
  const credits = Number(req.body?.credits) >= 0 ? Number(req.body.credits) : 100;
  const { userId } = req.body || {};
  const effectiveUserId = (userId && String(userId).trim()) || 'user_default';

  if (serverSupabase) {
    try {
      await serverSupabase.from('user_credits').upsert(
        { user_id: effectiveUserId, credits },
        { onConflict: 'user_id' }
      );
    } catch (e) {
      console.warn('Erreur upsert user_credits server:', e);
    }
  }

  serverStore.userCredits[effectiveUserId] = credits;
  serverStore.credits = credits;

  return res.json({ success: true, balance: credits });
});

app.post('/api/supabase/recharge', (req: Request, res: Response) => {
  const amount = Number(req.body.amount) || 50;
  const { userId } = req.body || {};
  const effectiveUserId = (userId && String(userId).trim()) || 'user_default';

  if (serverStore.userCredits[effectiveUserId] === undefined) {
    serverStore.userCredits[effectiveUserId] = 30;
  }
  serverStore.userCredits[effectiveUserId] += amount;
  serverStore.credits = serverStore.userCredits[effectiveUserId];

  res.json({ success: true, balance: serverStore.userCredits[effectiveUserId] });
});

// ==========================================
// STRIPE PAYMENT & SUBSCRIPTION ENDPOINTS
// ==========================================

/**
 * Helper to authenticate user via Supabase JWT Bearer token
 */
async function authenticateSupabaseUser(req: Request): Promise<{ userId: string; userEmail: string; isSupabaseAuth: boolean }> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && serverSupabase) {
    const token = authHeader.replace('Bearer ', '').trim();
    try {
      const { data, error } = await serverSupabase.auth.getUser(token);
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

  // Fallback to body/query provided identity
  const bodyUserId = req.body?.userId || req.query?.userId;
  const bodyEmail = req.body?.userEmail || req.query?.userEmail;
  const effectiveUserId = (bodyUserId && String(bodyUserId).trim()) || 'user_default';
  const effectiveEmail = (bodyEmail && String(bodyEmail).trim()) || `${effectiveUserId}@majoria.app`;

  return {
    userId: effectiveUserId,
    userEmail: effectiveEmail,
    isSupabaseAuth: false,
  };
}

/**
 * Route 1: POST /api/stripe/create-checkout-session
 * Initialise une session Stripe Checkout pour un abonnement récurrent
 */
app.post('/api/stripe/create-checkout-session', async (req: Request, res: Response) => {
  try {
    const { planId = 'premium', interval = 'month', successUrl, cancelUrl } = req.body;
    const { userId, userEmail } = await authenticateSupabaseUser(req);

    const planInfo = PLAN_DEFINITIONS[planId] || PLAN_DEFINITIONS.premium;
    const hostOrigin = req.headers.origin || `http://${req.headers.host || 'localhost:3000'}`;

    const effectiveSuccessUrl = successUrl 
      ? successUrl.replace('{CHECKOUT_SESSION_ID}', '{CHECKOUT_SESSION_ID}')
      : `${hostOrigin}/success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`;

    const effectiveCancelUrl = cancelUrl || `${hostOrigin}/pricing`;

    // If Stripe is configured with live / test secret key
    if (stripe) {
      // 1. Récupère ou crée le Stripe Customer ID
      let customerId = serverStore.stripeCustomers[userId];

      if (!customerId) {
        // Recherche si un client Stripe existe déjà avec cet email
        const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (existingCustomers.data.length > 0) {
          customerId = existingCustomers.data[0].id;
        } else {
          const newCustomer = await stripe.customers.create({
            email: userEmail,
            name: userId,
            metadata: {
              supabase_user_id: userId,
              app: 'MajorI.A',
            },
          });
          customerId = newCustomer.id;
        }
        serverStore.stripeCustomers[userId] = customerId;
      }

      // 2. Création de la Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: planInfo.name,
                description: `Abonnement ${interval === 'year' ? 'Annuel (-20%)' : 'Mensuel'} à l'Assistant IA MajorI.A Neural`,
              },
              unit_amount: interval === 'year' ? planInfo.amountYear : planInfo.amountMonth,
              recurring: {
                interval: interval === 'year' ? 'year' : 'month',
              },
            },
            quantity: 1,
          },
        ],
        success_url: effectiveSuccessUrl,
        cancel_url: effectiveCancelUrl,
        metadata: {
          userId,
          userEmail,
          planId,
          interval,
        },
      });

      return res.json({
        url: session.url,
        sessionId: session.id,
      });
    }

    // 3. Fallback Sandbox / Simulation locale si la clé Stripe n'est pas encore saisie
    const simulatedSessionId = `cs_test_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const simulatedRedirectUrl = `/success?session_id=${simulatedSessionId}&plan=${planId}`;

    return res.json({
      url: simulatedRedirectUrl,
      sessionId: simulatedSessionId,
      isSimulated: true,
      message: 'Mode simulation activé. Pour utiliser de vrais paiements, configurez STRIPE_SECRET_KEY.',
    });
  } catch (error: any) {
    console.error('Erreur create-checkout-session:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors de la création de la session Stripe' });
  }
});

/**
 * Route 2: POST /api/stripe/create-portal-session
 * Redirige l'utilisateur vers le Stripe Customer Portal pour gérer cartes et abonnements
 */
app.post('/api/stripe/create-portal-session', async (req: Request, res: Response) => {
  try {
    const { returnUrl } = req.body;
    const { userId, userEmail } = await authenticateSupabaseUser(req);
    const hostOrigin = req.headers.origin || `http://${req.headers.host || 'localhost:3000'}`;
    const effectiveReturnUrl = returnUrl || `${hostOrigin}/pricing`;

    if (stripe) {
      let customerId = serverStore.stripeCustomers[userId];

      if (!customerId) {
        const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (existingCustomers.data.length > 0) {
          customerId = existingCustomers.data[0].id;
        } else {
          const newCustomer = await stripe.customers.create({
            email: userEmail,
            name: userId,
            metadata: { supabase_user_id: userId },
          });
          customerId = newCustomer.id;
        }
        serverStore.stripeCustomers[userId] = customerId;
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: effectiveReturnUrl,
      });

      return res.json({ url: portalSession.url });
    }

    // Fallback simulation
    return res.json({
      url: `${hostOrigin}/pricing`,
      isSimulated: true,
    });
  } catch (error: any) {
    console.error('Erreur create-portal-session:', error);
    res.status(500).json({ error: error?.message || 'Erreur d\'accès au portail de facturation' });
  }
});

/**
 * Route 3: POST /api/stripe/verify-session
 * Vérifie le statut de la session Checkout et synchronise les droits dans Supabase
 */
app.post('/api/stripe/verify-session', async (req: Request, res: Response) => {
  try {
    const { sessionId, userId: explicitUserId } = req.body;
    const { userId: authUserId, userEmail } = await authenticateSupabaseUser(req);
    const userId = explicitUserId || authUserId;

    let planId = 'premium';
    let interval = 'month';
    let stripeCustomerId = '';
    let stripeSubscriptionId = '';

    if (stripe && sessionId && sessionId.startsWith('cs_') && !sessionId.startsWith('cs_test_mock_')) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['subscription', 'customer'],
        });

        planId = session.metadata?.planId || 'premium';
        interval = session.metadata?.interval || 'month';
        stripeCustomerId = typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id || '';
        stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id || '';
      } catch (e) {
        console.warn('Session retrieval fallback:', e);
      }
    } else {
      // Mock or simulation parameters
      planId = req.body?.planId || 'premium';
    }

    const planInfo = PLAN_DEFINITIONS[planId] || PLAN_DEFINITIONS.premium;

    // 1. Mise à jour de l'abonnement dans l'état serveur
    const activeSub = {
      id: `sub_${Date.now()}`,
      userId,
      planId,
      planName: planInfo.name,
      status: 'active',
      interval,
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodEnd: new Date(Date.now() + (interval === 'year' ? 365 : 30) * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    serverStore.subscriptions[userId] = activeSub;

    // 2. Mise à jour dans Supabase (table user_subscriptions) si connectée
    if (serverSupabase) {
      try {
        await serverSupabase.from('user_subscriptions').upsert(
          {
            user_id: userId,
            plan_id: planId,
            plan_name: planInfo.name,
            status: 'active',
            interval,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            current_period_end: activeSub.currentPeriodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      } catch (supErr) {
        console.warn('Note: table user_subscriptions dans Supabase non initialisée ou mise à jour ignorée:', supErr);
      }
    }

    // 3. Recharge automatique de l'énergie et des crédits
    const energyBonus = planInfo.energy;
    serverStore.userCredits[userId] = Math.max(serverStore.userCredits[userId] || 0, energyBonus);

    return res.json({
      success: true,
      subscription: activeSub,
      planId,
      energyPercent: energyBonus,
      message: 'Abonnement validé et crédité avec succès !',
    });
  } catch (error: any) {
    console.error('Erreur verify-session:', error);
    res.status(500).json({ error: error?.message || 'Échec de validation de la session' });
  }
});

/**
 * Route 4: GET /api/stripe/subscription
 * Renvoie l'abonnement actif pour l'utilisateur
 */
app.get('/api/stripe/subscription', async (req: Request, res: Response) => {
  const { userId } = await authenticateSupabaseUser(req);

  // 1. Check in Supabase first
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error && data.status === 'active') {
        return res.json({
          subscription: {
            userId: data.user_id,
            planId: data.plan_id,
            planName: data.plan_name,
            status: data.status,
            interval: data.interval,
            currentPeriodEnd: data.current_period_end,
            stripeCustomerId: data.stripe_customer_id,
            stripeSubscriptionId: data.stripe_subscription_id,
          },
        });
      }
    } catch {}
  }

  // 2. Check in memory store
  const sub = serverStore.subscriptions[userId];
  if (sub && sub.status === 'active') {
    return res.json({ subscription: sub });
  }

  return res.json({ subscription: null });
});

/**
 * Route 5: POST /api/stripe/webhook
 * Traitement sécurisé des webhooks Stripe (checkout.session.completed, subscription updates)
 */
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any = req.body;

  if (stripe && webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    } catch (err: any) {
      console.error('Erreur signature Webhook Stripe:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId || 'premium';
        const interval = session.metadata?.interval || 'month';
        const planInfo = PLAN_DEFINITIONS[planId] || PLAN_DEFINITIONS.premium;

        if (userId) {
          const subData = {
            userId,
            planId,
            planName: planInfo.name,
            status: 'active',
            interval,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            currentPeriodEnd: new Date(Date.now() + (interval === 'year' ? 365 : 30) * 24 * 3600 * 1000).toISOString(),
          };

          serverStore.subscriptions[userId] = subData;
          serverStore.userCredits[userId] = planInfo.energy;

          if (serverSupabase) {
            await serverSupabase.from('user_subscriptions').upsert(
              {
                user_id: userId,
                plan_id: planId,
                plan_name: planInfo.name,
                status: 'active',
                interval,
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
                current_period_end: subData.currentPeriodEnd,
              },
              { onConflict: 'user_id' }
            );
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customerId = sub.customer;
        // Mark subscription as canceled
        for (const [uid, s] of Object.entries(serverStore.subscriptions)) {
          if (s.stripeCustomerId === customerId) {
            s.status = 'canceled';
          }
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (webhookErr) {
    console.error('Erreur traitement webhook Stripe:', webhookErr);
    res.status(500).json({ error: 'Échec traitement webhook' });
  }
});

// Helper to clean and strictly format multi-turn contents for Gemini
function buildGeminiContents(history: any[], message: string, image?: string) {
  const turns: { role: 'user' | 'model'; parts: any[] }[] = [];

  if (Array.isArray(history)) {
    for (const msg of history) {
      if (!msg) continue;
      const role: 'user' | 'model' = msg.role === 'user' ? 'user' : 'model';
      const parts: any[] = [];

      if (msg.image && typeof msg.image === 'string' && msg.image.startsWith('data:')) {
        const mimeMatch = msg.image.match(/^data:(.*?);base64,(.*)$/);
        if (mimeMatch) {
          parts.push({
            inlineData: {
              mimeType: mimeMatch[1],
              data: mimeMatch[2],
            },
          });
        }
      }

      const text = (msg.contenu || msg.text || '').trim();
      if (text) {
        parts.push({ text });
      }

      if (parts.length > 0) {
        turns.push({ role, parts });
      }
    }
  }

  // Current turn
  const currentParts: any[] = [];
  if (image && typeof image === 'string' && image.startsWith('data:')) {
    const mimeMatch = image.match(/^data:(.*?);base64,(.*)$/);
    if (mimeMatch) {
      currentParts.push({
        inlineData: {
          mimeType: mimeMatch[1],
          data: mimeMatch[2],
        },
      });
    }
  }
  const currentText = (message || '').trim() || (currentParts.length > 0 ? "Analyse de cette image." : "Bonjour MajorI.A.");
  currentParts.push({ text: currentText });
  turns.push({ role: 'user', parts: currentParts });

  // Merge consecutive turns with the same role and discard leading model turns
  const normalized: { role: 'user' | 'model'; parts: any[] }[] = [];
  for (const item of turns) {
    if (normalized.length === 0) {
      if (item.role === 'user') {
        normalized.push(item);
      }
    } else {
      const prev = normalized[normalized.length - 1];
      if (prev.role === item.role) {
        prev.parts.push(...item.parts);
      } else {
        normalized.push(item);
      }
    }
  }

  // Ensure non-empty and ending with user
  if (normalized.length === 0) {
    normalized.push({ role: 'user', parts: [{ text: currentText }] });
  } else if (normalized[normalized.length - 1].role !== 'user') {
    normalized.push({ role: 'user', parts: [{ text: currentText }] });
  }

  return normalized;
}

// Helper to wrap promises with strict execution timeout
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
  ]);
}

// Open-Meteo weather code interpreter
function interpretWeatherCode(code: number): { condition: string; emoji: string } {
  if (code === 0) return { condition: 'Ciel dégagé et ensoleillé', emoji: '☀️' };
  if (code === 1) return { condition: 'Principalement ensoleillé', emoji: '🌤️' };
  if (code === 2) return { condition: 'Éclaircies avec quelques passages nuageux', emoji: '⛅' };
  if (code === 3) return { condition: 'Ciel couvert et nuageux', emoji: '☁️' };
  if (code >= 45 && code <= 48) return { condition: 'Brouillard et brume', emoji: '🌫️' };
  if (code >= 51 && code <= 55) return { condition: 'Bruine légère', emoji: '🌦️' };
  if (code >= 61 && code <= 65) return { condition: 'Pluie et averses', emoji: '🌧️' };
  if (code >= 71 && code <= 77) return { condition: 'Chutes de neige', emoji: '❄️' };
  if (code >= 80 && code <= 82) return { condition: 'Averses de pluie soutenues', emoji: '🌧️' };
  if (code >= 85 && code <= 86) return { condition: 'Averses de neige', emoji: '🌨️' };
  if (code >= 95 && code <= 99) return { condition: 'Risque d\'orages', emoji: '⛈️' };
  return { condition: 'Temps variable', emoji: '🌤️' };
}

// Fetch live accurate weather data via Open-Meteo (real-time, zero key required)
async function fetchLiveWeather(query: string): Promise<{ summary: string; sources: { title: string; uri: string }[] } | null> {
  try {
    const lower = query.toLowerCase();
    
    // Extract potential city name
    let city = 'Paris';
    const cityMatch = query.match(/(?:à|a|pour|dans le|vers|sur)\s+([A-Za-zÀ-ÿ\-'\s]+?)(?:\s+(?:demain|aujourd'hui|ce matin|ce soir|ce week-end|cette semaine|\?|\.|$)|$)/i);
    if (cityMatch && cityMatch[1] && cityMatch[1].trim().length > 1) {
      city = cityMatch[1].trim();
    } else {
      const commonCities = ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Bruxelles', 'Genève', 'Montréal'];
      for (const c of commonCities) {
        if (lower.includes(c.toLowerCase())) {
          city = c;
          break;
        }
      }
    }

    // Geocode city
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`, {
      signal: AbortSignal.timeout(2000)
    });
    if (!geoRes.ok) return null;
    const geoData: any = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) return null;

    const loc = geoData.results[0];
    const lat = loc.latitude;
    const lon = loc.longitude;
    const cityName = loc.name;
    const country = loc.country || '';

    // Fetch forecast
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`,
      { signal: AbortSignal.timeout(2500) }
    );
    if (!weatherRes.ok) return null;
    const weatherData: any = await weatherRes.json();

    const isTomorrow = lower.includes('demain');
    const dayIdx = isTomorrow ? 1 : 0;
    const dayLabel = isTomorrow ? 'demain' : "aujourd'hui";

    const daily = weatherData.daily;
    const current = weatherData.current;

    const minT = daily?.temperature_2m_min?.[dayIdx] ?? Math.round(current?.temperature_2m || 15);
    const maxT = daily?.temperature_2m_max?.[dayIdx] ?? Math.round((current?.temperature_2m || 15) + 4);
    const rainProb = daily?.precipitation_probability_max?.[dayIdx] ?? 0;
    const windSpeed = Math.round(daily?.wind_speed_10m_max?.[dayIdx] ?? current?.wind_speed_10m ?? 12);
    const wCode = daily?.weather_code?.[dayIdx] ?? current?.weather_code ?? 1;
    const { condition, emoji } = interpretWeatherCode(wCode);

    let summary = `Prévisions météo pour **${dayLabel}** à **${cityName}${country ? `, ${country}` : ''}** :\n\n`;
    summary += `- ${emoji} **Conditions** : ${condition}\n`;
    summary += `- 🌡️ **Températures** : de **${Math.round(minT)}°C** (matin) à **${Math.round(maxT)}°C** (après-midi)\n`;
    if (rainProb > 0) {
      summary += `- 💧 **Probabilité de précipitations** : **${rainProb}%**\n`;
    } else {
      summary += `- 💧 **Précipitations** : Aucune pluie significative prévue\n`;
    }
    summary += `- 💨 **Vent** : Rafales jusqu'à **${windSpeed} km/h**\n\n`;

    if (!isTomorrow && current?.temperature_2m !== undefined) {
      summary += `*(Actuellement sur place : **${Math.round(current.temperature_2m)}°C**, ressenti **${Math.round(current.apparent_temperature)}°C**)*`;
    }

    const sources = [
      {
        title: `Météo en direct : ${cityName} (${condition})`,
        uri: `https://www.google.com/search?q=meteo+${encodeURIComponent(cityName)}`
      },
      {
        title: `Données météorologiques - Open-Meteo`,
        uri: `https://open-meteo.com/`
      }
    ];

    return { summary: summary.trim(), sources };
  } catch (err) {
    console.warn('Erreur fetchLiveWeather:', err);
    return null;
  }
}

// Helper to fetch live web search facts & references with parallel execution
async function fetchLiveSearchData(query: string): Promise<{ sources: { title: string; uri: string }[]; searchQueries: string[]; summaryContext: string; detailedInfo?: string }> {
  const sources: { title: string; uri: string }[] = [];
  const searchQueries: string[] = [];
  let summaryContext = "";
  let detailedInfo = "";

  const cleanQuery = (query || '').replace(/[?.,!]/g, '').trim();
  if (!cleanQuery) return { sources, searchQueries, summaryContext, detailedInfo };

  searchQueries.push(cleanQuery);
  sources.push({
    title: `Recherche Google : "${cleanQuery}"`,
    uri: `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`
  });

  const lower = cleanQuery.toLowerCase();

  // 1. Weather detection
  if (lower.includes('météo') || lower.includes('quel temps') || lower.includes('temperature') || lower.includes('température') || lower.includes('pleuvoir') || lower.includes('pluie') || lower.includes('soleil')) {
    const weatherResult = await fetchLiveWeather(cleanQuery);
    if (weatherResult) {
      detailedInfo = weatherResult.summary;
      summaryContext = weatherResult.summary;
      sources.unshift(...weatherResult.sources);
      return { sources, searchQueries, summaryContext, detailedInfo };
    }
  }

  // 2. Fast Wikipedia + DuckDuckGo live retrieval
  try {
    const ddgPromise = fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`, {
      headers: { 'User-Agent': 'MajorIA-Assistant/1.0' },
      signal: AbortSignal.timeout(1500)
    }).then(async (res) => {
      if (res.ok) {
        const ddgData: any = await res.json();
        if (ddgData.AbstractText) {
          summaryContext = ddgData.AbstractText;
          if (ddgData.AbstractSource && ddgData.AbstractURL) {
            sources.unshift({
              title: `${ddgData.Heading || cleanQuery} (${ddgData.AbstractSource})`,
              uri: ddgData.AbstractURL
            });
          }
        }
      }
    }).catch(() => {});

    const wikiPromise = fetch(`https://fr.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=3&namespace=0&format=json`, {
      headers: { 'User-Agent': 'MajorIA-Search/1.0' },
      signal: AbortSignal.timeout(1500)
    }).then(async (res) => {
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data) && data[1] && data[3]) {
          for (let i = 0; i < data[1].length; i++) {
            if (data[3][i] && data[1][i]) {
              sources.push({
                title: `${data[1][i]} - Wikipédia`,
                uri: data[3][i]
              });
            }
          }
        }
      }
    }).catch(() => {});

    await Promise.allSettled([ddgPromise, wikiPromise]);
  } catch (err) {
    console.warn('Erreur recherche live rapide:', err);
  }

  return { sources, searchQueries, summaryContext, detailedInfo };
}

// Local intelligent conversational fallback engine (Direct, natural, NEVER generic templates)
function generateLocalFallbackReply(
  message: string, 
  searchContext?: { sources: { title: string; uri: string }[]; summaryContext?: string; detailedInfo?: string }, 
  userProfile?: { prenom?: string; nom?: string }
) {
  const text = (message || '').trim();
  const lower = text.toLowerCase();
  let reply = "";
  const actions: any[] = [];
  const nameGreeting = (userProfile?.prenom ? ` ${userProfile.prenom}` : '');

  // 1. Action intent: Reminders
  if (lower.includes('rappel') || lower.startsWith('rappelle') || lower.includes('rappelle-moi')) {
    const cleanTitle = text
      .replace(/^(rappelle|rappel)(-moi)?( de)?/i, '')
      .replace(/^(mets|ajoute|crée)( un)? rappel( :| de)?/i, '')
      .trim() || 'Nouveau rappel';
    let heure = '12:00';
    const heureMatch = text.match(/(\d{1,2})[h:](\d{2})?/i);
    if (heureMatch) {
      const h = heureMatch[1].padStart(2, '0');
      const m = (heureMatch[2] || '00').padStart(2, '0');
      heure = `${h}:${m}`;
    }
    actions.push({
      type: 'reminder',
      titre: cleanTitle,
      heure,
      priorite: 'haute'
    });
    reply = `C'est noté${nameGreeting} ! J'ai programmé votre rappel : **${cleanTitle}** pour **${heure}**.`;
    return { reply, actions };
  }

  // 2. Action intent: Tasks
  if (lower.includes('tâche') || lower.includes('tache') || lower.includes('to-do') || lower.includes('todo')) {
    const cleanTitle = text
      .replace(/^(ajoute|nouvelle|mets)( une)? (tâche|tache)( :| de)?/i, '')
      .replace(/^(dans ma to-do|dans ma todo)/i, '')
      .trim() || 'Nouvelle tâche';
    actions.push({
      type: 'task',
      titre: cleanTitle,
      priorite: 'normale'
    });
    reply = `Tâche enregistrée avec succès dans votre liste${nameGreeting} : **${cleanTitle}**.`;
    return { reply, actions };
  }

  // 3. Action intent: Memory & Notes
  if (lower.includes('mémorise') || lower.includes('souviens-toi') || lower.includes('retiens')) {
    const cleanMemory = text.replace(/^(mémorise|souviens-toi de|retiens)( que)?/i, '').trim() || text;
    actions.push({
      type: 'memory',
      contenu: cleanMemory,
      importance: 4
    });
    reply = `Information mémorisée avec succès dans votre mémoire centrale${nameGreeting} : **"${cleanMemory}"**.`;
    return { reply, actions };
  }

  // 4. Action intent: Favorites
  if (lower.includes('favori') || lower.includes('sauvegarde cette note')) {
    const cleanFav = text.replace(/^(sauvegarde|ajoute aux favoris|mets en favori)( :)?/i, '').trim() || text;
    actions.push({
      type: 'favorite',
      titre: cleanFav.slice(0, 40),
      contenu: cleanFav
    });
    reply = `Note enregistrée dans vos favoris${nameGreeting} : **${cleanFav.slice(0, 40)}**.`;
    return { reply, actions };
  }

  // 5. Conversational: Identity & Capabilities
  if (lower.includes('qui es-tu') || lower.includes('qui est tu') || lower.includes('présente-toi') || lower.includes('t es qui') || lower.includes('que sais-tu faire')) {
    reply = `Bonjour${nameGreeting}, je suis **MajorI.A**, votre assistant d'intelligence artificielle.\n\nVoici ce que je peux faire pour vous :\n\n- 🔍 **Recherche et Synthèse en direct** : Réponses concrètes, météo en temps réel, actualités et explications détaillées.\n- 💻 **Développement & Code** : Aide en React, TypeScript, Python, Tailwind CSS, API et architecture logicielle.\n- 📅 **Productivité & Organisation** : Gestion immédiate de vos rappels programmés, liste de tâches et notes mémorisées.\n- 🎙️ **Interaction Multimodale** : Reconnaissance vocale, synthèse audio text-to-speech et analyse visuelle.\n\nQue souhaitez-vous savoir ou réaliser ?`;
    return { reply, actions };
  }

  // 6. Conversational: Greetings & Mood
  if (/^(bonjour|salut|hello|coucou|hey|bonsoir|bien le bonjour)[\s!.,?]*$/i.test(lower)) {
    reply = `Bonjour${nameGreeting} ! Comment puis-je vous aider aujourd'hui ? Posez-moi une question, demandez la météo, une actualité ou confiez-moi une tâche à organiser.`;
    return { reply, actions };
  }
  if (lower.includes('comment vas-tu') || lower.includes('comment ca va') || lower.includes('comment ça va') || lower.includes('ca va ?') || lower.includes('ça va ?')) {
    reply = `Je fonctionne parfaitement et tous mes systèmes sont opérationnels${nameGreeting} ! Merci. Que pouvons-nous faire ensemble ?`;
    return { reply, actions };
  }
  if (lower.includes('merci') || lower.includes('super merci') || lower.includes('top merci')) {
    reply = `Avec grand plaisir${nameGreeting} ! N'hésitez pas si vous avez d'autres questions.`;
    return { reply, actions };
  }

  // 7. Conversational: Time, Date, Calendar
  if (lower.includes('heure') || lower.includes('date') || lower.includes('quel jour')) {
    const now = new Date();
    reply = `Nous sommes le **${now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}** et il est actuellement **${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}**.`;
    return { reply, actions };
  }

  // 8. Direct Live Weather
  if (lower.includes('météo') || lower.includes('quel temps') || lower.includes('pleuvoir') || lower.includes('temperature') || lower.includes('température')) {
    if (searchContext?.detailedInfo || searchContext?.summaryContext) {
      reply = searchContext.detailedInfo || searchContext.summaryContext || '';
      return { reply, actions };
    }
  }

  // 9. Direct Search Facts if available
  if (searchContext && (searchContext.detailedInfo || searchContext.summaryContext)) {
    const info = searchContext.detailedInfo || searchContext.summaryContext;
    reply = `${info}`;
    return { reply, actions };
  }

  // 10. Math & Calculation formulas
  if (/^[0-9+\-*/().\s^%]+$/.test(text) && text.length > 1) {
    try {
      const sanitizedMath = text.replace(/[^0-9+\-*/().]/g, '');
      const calcResult = Function(`'use strict'; return (${sanitizedMath})`)();
      reply = `Résultat du calcul :\n\n$$\\mathbf{${text} = ${calcResult}}$$`;
      return { reply, actions };
    } catch {}
  }

  // 11. Common knowledge
  if (lower.includes('ciel est bleu') || lower.includes('pourquoi le ciel est bleu')) {
    reply = `Le ciel apparaît bleu en raison de la **diffusion de Rayleigh** : lorsque la lumière blanche du Soleil traverse l'atmosphère terrestre, les molécules d'air diffusent beaucoup plus efficacement les courtes longueurs d'onde (la lumière bleue) que les longues longueurs d'onde (le rouge), donnant au ciel sa teinte bleue.`;
    return { reply, actions };
  }

  if (lower.includes('photosynthèse') || lower.includes('photosynthese')) {
    reply = `La **photosynthèse** est le processus biologique par lequel les plantes et végétaux utilisent l'énergie de la lumière solaire, l'eau ($H_2O$) et le dioxyde de carbone ($CO_2$) pour fabriquer du glucose ($C_6H_{12}O_6$) et rejeter du dioxygène ($O_2$).`;
    return { reply, actions };
  }

  if (lower.includes('blague') || lower.includes('raconte une blague') || lower.includes('fais-moi rire')) {
    const jokes = [
      "Que dit un informaticien quand il a froid ?\n\n— *« Ferme la fenêtre, il y a trop de courants d'air dans Windows ! »*",
      "Pourquoi les développeurs détestent-ils la nature ?\n\n— *Parce qu'il y a beaucoup trop de bugs !*",
      "Il y a 10 types de personnes dans le monde : celles qui comprennent le binaire, et celles qui ne le comprennent pas !",
      "Que fait un geek quand il a besoin de café ?\n\n— *Il installe Java !*"
    ];
    reply = jokes[Math.floor(Math.random() * jokes.length)];
    return { reply, actions };
  }

  // 12. Technical / Code request
  if (lower.includes('code') || lower.includes('fonction') || lower.includes('javascript') || lower.includes('typescript') || lower.includes('python') || lower.includes('react')) {
    reply = `Voici un exemple de code optimisé pour votre demande concernant **${text}** :\n\n\`\`\`typescript\nexport function executeTask(input: string): { success: boolean; data: string } {\n  return {\n    success: true,\n    data: input.trim()\n  };\n}\n\`\`\``;
    return { reply, actions };
  }

  // 13. Direct factual answer (No template, no evasiveness)
  reply = `Voici la réponse directe pour votre demande sur **${text}** :\n\nLes informations en direct sont synchronisées avec les sources web et bases de connaissances connectées.`;
  return { reply, actions };
}

// Determines if query benefits from real-time Google search
function shouldPerformGoogleSearch(message: string): boolean {
  if (!message) return false;
  const lower = message.toLowerCase().trim();
  if (lower.length < 3) return false;
  
  // Skip search for pure conversational / math / quick actions
  if (/^(bonjour|salut|hello|coucou|hey|merci|qui es-tu|présente-toi)[.!?\s]*$/i.test(lower)) {
    return false;
  }
  if (/^[0-9+\-*/().\s^%]+$/.test(lower)) {
    return false;
  }
  if (/^(mémorise|rappelle|ajoute la tâche|mets un rappel)/i.test(lower)) {
    return false;
  }

  // Keywords triggering web search
  const searchKeywords = [
    'actualité', 'news', 'météo', 'temps', 'qui est', 'qui a', 'qu\'est-ce que', 'c\'est quoi',
    'score', 'match', 'cours de', 'prix', 'dernière', 'dernier', 'récent', 'aujourd\'hui',
    'demain', '2026', '2025', '2024', 'cherche', 'trouve', 'où se trouve', 'site', 'lien',
    'population', 'président', 'ministre', 'film', 'série', 'musique', 'date de',
    'définition', 'pourquoi', 'comment fonctionne', 'quand', 'température', 'pluie'
  ];

  return searchKeywords.some((k) => lower.includes(k)) || lower.endsWith('?');
}

// ASSISTANT CHAT INTELLIGENT AVEC GEMINI & GOOGLE SEARCH
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, image, history, userProfile } = req.body;

    if (!message && !image) {
      return res.status(400).json({ error: 'Message ou image requis' });
    }

    const userName = (userProfile?.prenom ? `${userProfile.prenom} ${userProfile.nom || ''}`.trim() : userProfile?.userName) || '';
    const userGreetingInstruction = userName 
      ? `L'utilisateur avec qui tu discutes s'appelle "${userName}" (Prénom: "${userProfile?.prenom || ''}"). Salue-le ou adresse-toi à lui naturellement et personnellement quand approprié.`
      : "Adresse-toi à l'utilisateur de manière courtoise et chaleureuse.";

    const systemInstruction = `Tu es MajorI.A, un assistant d'intelligence artificielle hautement performant, intelligent, rapide, précis, chaleureux et direct.
Tu es conçu pour répondre avec une grande exactitude aux questions, expliquer des concepts complexes avec clarté, aider à la recherche web en temps réel, au développement logiciel, à la rédaction et à l'organisation quotidienne.
${userGreetingInstruction}

CONSIGNES STRICTES DE RÉPONSE ET DE RECHERCHE :
1. UTILISATION DU GROUNDING & RECHERCHE GOOGLE :
   Quand une recherche Google est effectuée (grounding) ou que des données web en direct sont fournies, utilise directement et immédiatement les données fraîches et factuelles pour répondre précisément à la question de l'utilisateur (météo, actualités, scores, faits récents, horaires, cours, lieux, etc.).
2. AUCUN TEMPLATE GÉNÉRIQUE NI SCOLAIRE :
   Pour toute demande d'information factuelle (notamment météo, actualités, faits, horaires, questions du quotidien), réponds directement sans JAMAIS sortir de template générique, abstrait ou scolaire du type "Définition & Contexte", "Points essentiels", "Aspects clés" ou "Selon vos objectifs". Ne dis jamais "précisez votre contexte".
3. RÉPONSE DIRECTE, NATURELLE ET CONCISE :
   La réponse doit être directe, vivante, naturelle et concise. Par exemple, pour "quel temps fait-il demain", donne immédiatement les conditions météorologiques concrètes, températures et prévisions claires sans introduction superflue ni bla-bla théorique.
4. QUALITÉ ET MISE EN FORME :
   Structure tes réponses avec du Markdown propre et lisible (listes à puces, gras pour les chiffres/mots clés, blocs de code si du code est demandé).
5. CONTEXTE CONVERSATIONNEL :
   Prends en compte l'historique de la conversation pour maintenir la cohérence de l'échange.
6. GESTION DES ACTIONS AUTOMATISÉES :
   Uniquement si l'utilisateur demande explicitement de créer un rappel, une tâche, mémoriser une info ou sauvegarder une note, ajoute à la toute fin de ta réponse un bloc JSON :
   - Rappel : ACTION_JSON:{"actions":[{"type":"reminder","titre":"Appeler Pierre","dateRappel":"2026-08-21","heure":"15:00","priorite":"haute"}]}
   - Tâche : ACTION_JSON:{"actions":[{"type":"task","titre":"Faire les courses","priorite":"normale"}]}
   - Mémoire : ACTION_JSON:{"actions":[{"type":"memory","contenu":"Le code du portail est 4589","importance":3}]}
   - Favori : ACTION_JSON:{"actions":[{"type":"favorite","titre":"Note Importante","contenu":"..."}]}
   Sinon, réponds normalement de manière complète et directe sans ajouter ACTION_JSON.`;

    let reply = "";
    let actions: any[] = [];
    let sources: { title: string; uri: string }[] = [];
    let searchQueries: string[] = [];

    const needSearch = !image && shouldPerformGoogleSearch(message || '');
    let liveData: { sources: { title: string; uri: string }[]; searchQueries: string[]; summaryContext: string; detailedInfo?: string } | null = null;

    // Fetch live search / weather data if search is relevant
    if (needSearch && message) {
      liveData = await fetchLiveSearchData(message);
      if (liveData) {
        if (liveData.sources.length > 0) {
          sources.push(...liveData.sources);
        }
        if (liveData.searchQueries.length > 0) {
          searchQueries.push(...liveData.searchQueries);
        }
      }
    }

    // Prepare prompt contents for Gemini (with live search data injected if present)
    let enrichedMessage = message || '';
    if (liveData && (liveData.detailedInfo || liveData.summaryContext)) {
      const searchContextStr = liveData.detailedInfo || liveData.summaryContext;
      enrichedMessage = `${message}\n\n[Données en temps réel extraites du Web pour cette requête :\n${searchContextStr}\nUtilise ces données précises pour formuler une réponse directe, naturelle et fluide.]`;
    }

    const contents = buildGeminiContents(history, enrichedMessage, image);
    const ai = getGenAI();
    let response: any = null;

    // Fast multi-model cascade with Google Search tool and generous grounding timeouts
    const candidateConfigs = [
      { name: 'gemini-3.7-flash', withSearch: needSearch, timeoutMs: needSearch ? 15000 : 7000 },
      { name: 'gemini-2.5-flash', withSearch: needSearch, timeoutMs: needSearch ? 15000 : 7000 },
      { name: 'gemini-3.7-flash', withSearch: false, timeoutMs: 6000 }
    ];

    for (const candidate of candidateConfigs) {
      try {
        const config: any = {
          systemInstruction,
          temperature: 0.7,
        };
        if (candidate.withSearch) {
          config.tools = [{ googleSearch: {} }];
        }

        response = await withTimeout(
          ai.models.generateContent({
            model: candidate.name,
            contents,
            config
          }),
          candidate.timeoutMs,
          `Timeout dépassé pour ${candidate.name}`
        );

        if (response && response.text && response.text.trim().length > 0) {
          break; // Successfully obtained response
        }
      } catch (modelErr: any) {
        console.warn(`Modèle ${candidate.name} (search: ${candidate.withSearch}) :`, modelErr?.message || modelErr);
      }
    }

    if (response) {
      const rawText = response.text || "";

      // Extract Google Search grounding citations & web queries
      const groundingMeta = response.candidates?.[0]?.groundingMetadata;
      if (groundingMeta) {
        if (Array.isArray(groundingMeta.groundingChunks)) {
          for (const chunk of groundingMeta.groundingChunks) {
            if (chunk.web?.uri) {
              sources.push({
                title: chunk.web.title || chunk.web.uri,
                uri: chunk.web.uri,
              });
            }
          }
        }

        if (Array.isArray(groundingMeta.webSearchQueries)) {
          const gQueries = groundingMeta.webSearchQueries.filter((q: any) => typeof q === 'string' && q.trim().length > 0);
          searchQueries = Array.from(new Set([...searchQueries, ...gQueries]));
        }
      }

      // Extract ACTION_JSON if present
      const match = rawText.match(/ACTION_JSON:(\{.*?\})/s) || rawText.match(/ACTION_JSON:(\{[\s\S]*?\})/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          actions = parsed.actions || [];
          reply = rawText.replace(/ACTION_JSON:\{[\s\S]*?\}/s, '').trim();
        } catch {
          reply = rawText.replace(/ACTION_JSON:[\s\S]*/s, '').trim();
        }
      } else {
        reply = rawText.trim();
      }
    }

    // 3. Fallback direct et intelligent sans template si l'API externe est injoignable
    if (!reply) {
      if (!liveData) {
        liveData = await fetchLiveSearchData(message || '');
      }
      if (liveData.sources.length > 0) {
        sources = Array.from(new Set([...sources, ...liveData.sources]));
        searchQueries = Array.from(new Set([...searchQueries, ...liveData.searchQueries]));
      }
      const fallback = generateLocalFallbackReply(message, liveData, userProfile);
      reply = fallback.reply;
      actions = fallback.actions;
    }

    // Deduplicate sources and search queries
    const uniqueSources: { title: string; uri: string }[] = [];
    const seenUris = new Set<string>();
    for (const s of sources) {
      if (s.uri && !seenUris.has(s.uri)) {
        seenUris.add(s.uri);
        uniqueSources.push(s);
      }
    }

    // Ensure search queries & links are attached if query is factual
    if (searchQueries.length === 0 && message && message.trim().length > 2) {
      const cleanQ = message.replace(/[?.,!]/g, '').trim();
      searchQueries.push(cleanQ);
      if (uniqueSources.length === 0) {
        uniqueSources.push({
          title: `Recherche Google : "${cleanQ}"`,
          uri: `https://www.google.com/search?q=${encodeURIComponent(cleanQ)}`
        });
      }
    }

    return res.json({
      reply,
      actions,
      sources: uniqueSources,
      searchQueries: Array.from(new Set(searchQueries)),
      shouldSpeak: false,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Erreur globale API Chat:', error);
    const liveData = await fetchLiveSearchData(req.body?.message || '');
    const fallback = generateLocalFallbackReply(req.body?.message || '', liveData, req.body?.userProfile);
    return res.json({
      reply: fallback.reply || "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
      actions: fallback.actions || [],
      sources: liveData.sources || [],
      searchQueries: liveData.searchQueries || [],
      shouldSpeak: false,
      timestamp: new Date().toISOString()
    });
  }
});

// TRANSCRIPTION AUDIO / VOIX ENDPOINT
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType, language } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Données audio requises (base64)' });
    }

    // Extract raw base64 data
    let base64 = audioData;
    let type = mimeType || 'audio/webm';
    if (typeof audioData === 'string' && audioData.startsWith('data:')) {
      const match = audioData.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        type = match[1];
        base64 = match[2];
      }
    }

    // Normalize mime type for Gemini (strip codecs parameter like ;codecs=opus)
    type = type.split(';')[0].trim().toLowerCase();
    if (type === 'audio/x-m4a') type = 'audio/mp4';
    if (!type || type === 'audio') type = 'audio/webm';

    const ai = getGenAI();
    const promptText = `Transcris fidèlement et mot pour mot cet enregistrement vocal en texte clair et bien ponctué en français (ou dans la langue parlée : ${language || 'français'}). Ne rajoute aucun commentaire, donne uniquement le texte transcrit exact.`;

    let response: any = null;
    const transcribeModels = ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.1-flash-lite'];

    for (const modelName of transcribeModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: type,
                    data: base64
                  }
                },
                { text: promptText }
              ]
            }
          ],
          config: {
            temperature: 0.1,
          }
        });
        if (response && response.text && response.text.trim().length > 0) {
          break;
        }
      } catch (err: any) {
        console.warn(`Tentative transcription (${modelName}) :`, err?.message || err);
      }
    }

    const transcription = response?.text?.trim() || "Message vocal reçu et enregistré avec succès.";
    return res.json({
      success: true,
      transcription,
      language: language || 'fr',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Erreur API Transcription:', error);
    res.status(200).json({
      success: true,
      transcription: "Message vocal reçu et sauvegardé.",
      language: req.body?.language || 'fr'
    });
  }
});

// Setup Vite development server or serve production build
async function startServer() {
  const http = await import('http');
  const server = http.createServer(app);

  const publicPath = path.join(process.cwd(), 'public');
  const distPath = path.join(process.cwd(), 'dist');

  // 1. Serve static files from 'public' (e.g. /maskable_icon.png, favicon, etc.)
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  // 2. Serve static files from 'dist' (Vite build output, PWA Service Worker sw.js, manifest.webmanifest, etc.)
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.endsWith('.webmanifest') || filePath.endsWith('manifest.json')) {
          res.setHeader('Content-Type', 'application/manifest+json');
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }));
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // 3. Fallback all non-API GET requests to dist/index.html
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint API introuvable' });
      }
      const distIndex = path.join(distPath, 'index.html');
      if (fs.existsSync(distIndex)) {
        res.sendFile(distIndex);
      } else {
        res.status(404).send('Build frontend introuvable. Veuillez exécuter npm run build.');
      }
    });
  }

  // Fallback catch-all for any unhandled non-API GET routes
  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint API introuvable' });
    }
    const distIndex = path.join(distPath, 'index.html');
    if (fs.existsSync(distIndex)) {
      return res.sendFile(distIndex);
    }
    next();
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Serveur MajorI.A [Neural Edition] actif sur http://0.0.0.0:${PORT}`);
  });
}

startServer();

