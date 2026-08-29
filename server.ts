import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Initialize Stripe Client with secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecretKey && stripeSecretKey.trim() !== '' && stripeSecretKey !== 'sk_test_placeholder' 
  ? new Stripe(stripeSecretKey.trim(), { apiVersion: '2025-02-24.acacia' as any })
  : null;

if (stripe) {
  console.log('Stripe SDK initialized successfully with live/test secret key.');
} else {
  console.log('Stripe SDK: configure STRIPE_SECRET_KEY to enable live checkout.');
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
  basic: { name: 'Formule Essentielle (Major2I.A)', amountMonth: 990, amountYear: 9504, energy: 100 },
  premium: { name: 'Formule Performance (Major2I.A)', amountMonth: 1990, amountYear: 19104, energy: 250 },
  pro: { name: 'Formule Illimitée Pro (Major2I.A)', amountMonth: 3990, amountYear: 38304, energy: 500 },
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

app.put('/api/favoris/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = serverStore.favoris.findIndex(f => f.id === id);
  if (idx !== -1) {
    serverStore.favoris[idx] = { ...serverStore.favoris[idx], ...req.body };
    res.json(serverStore.favoris[idx]);
  } else {
    res.status(404).json({ error: 'Favori introuvable' });
  }
});

app.patch('/api/favoris/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = serverStore.favoris.findIndex(f => f.id === id);
  if (idx !== -1) {
    serverStore.favoris[idx] = { ...serverStore.favoris[idx], ...req.body };
    res.json(serverStore.favoris[idx]);
  } else {
    res.status(404).json({ error: 'Favori introuvable' });
  }
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

app.put('/api/memoire/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = serverStore.memoire.findIndex(m => m.id === id);
  if (idx !== -1) {
    serverStore.memoire[idx] = { ...serverStore.memoire[idx], ...req.body };
    res.json(serverStore.memoire[idx]);
  } else {
    res.status(404).json({ error: 'Mémoire introuvable' });
  }
});

app.patch('/api/memoire/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = serverStore.memoire.findIndex(m => m.id === id);
  if (idx !== -1) {
    serverStore.memoire[idx] = { ...serverStore.memoire[idx], ...req.body };
    res.json(serverStore.memoire[idx]);
  } else {
    res.status(404).json({ error: 'Mémoire introuvable' });
  }
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
      // Step A: Ensure user exists in user_credits with 30 default credits if possible
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
      } catch {
        // Table may not exist yet, ignore
      }

      // Step B: Call RPC use_credit with various common signatures
      let rpcResult: { data: any; error: any } = { data: null, error: null };
      
      try {
        const r1 = await serverSupabase.rpc('use_credit', { user_id: effectiveUserId });
        if (!r1.error && r1.data !== null && r1.data !== undefined) {
          rpcResult = r1;
        } else {
          const r2 = await serverSupabase.rpc('use_credit', { p_user_id: effectiveUserId });
          if (!r2.error && r2.data !== null && r2.data !== undefined) {
            rpcResult = r2;
          } else {
            const r3 = await serverSupabase.rpc('use_credit');
            if (!r3.error && r3.data !== null && r3.data !== undefined) {
              rpcResult = r3;
            } else {
              rpcResult = { data: null, error: r1.error || r2.error || r3.error };
            }
          }
        }
      } catch (rpcErr) {
        rpcResult = { error: rpcErr, data: null };
      }

      const { data, error } = rpcResult;
      if (!error && data !== null && data !== undefined) {
        const val = typeof data === 'number' ? data : Number(data);
        if (!isNaN(val)) {
          if (val === -1) {
            return res.json({ success: false, balance: -1, isExhausted: true, error: 'Crédits épuisés (-1)', source: 'supabase-rpc' });
          }
          return res.json({ success: true, balance: val, isExhausted: false, source: 'supabase-rpc' });
        }
      }

      // Step C: Fallback to direct user_credits table query if RPC is not available
      try {
        const { data: userRow, error: tableErr } = await serverSupabase
          .from('user_credits')
          .select('credits')
          .eq('user_id', effectiveUserId)
          .maybeSingle();

        if (!tableErr && userRow !== null && userRow !== undefined) {
          let current = userRow?.credits !== undefined ? Number(userRow.credits) : 30;
          if (isNaN(current)) current = 30;

          if (current <= 0) {
            return res.json({ success: false, balance: -1, isExhausted: true, error: 'Crédits épuisés (-1)', source: 'supabase-table' });
          }

          const decremented = current - 1;
          await serverSupabase
            .from('user_credits')
            .upsert({ user_id: effectiveUserId, credits: decremented }, { onConflict: 'user_id' });

          return res.json({ success: true, balance: decremented, isExhausted: false, source: 'supabase-table' });
        }
      } catch {
        // Table not present or failed, fallback smoothly to serverStore
      }
    } catch (err: any) {
      // Supabase unavailable, fallback to serverStore
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
 * Helper: Création d'une session Stripe Checkout
 */
async function handleCreateCheckoutSession(req: Request, res: Response) {
  try {
    const { planId = 'premium', interval = 'month', successUrl, cancelUrl } = req.body || {};
    const { userId, userEmail } = await authenticateSupabaseUser(req);

    const activeStripeKey = process.env.STRIPE_SECRET_KEY || '';
    const activeStripe = stripe || (activeStripeKey.trim() !== '' ? new Stripe(activeStripeKey.trim(), { apiVersion: '2025-02-24.acacia' as any }) : null);

    if (!activeStripe) {
      return res.status(400).json({
        error: 'Configuration Stripe manquante sur le serveur : variable STRIPE_SECRET_KEY non renseignée dans les paramètres.',
      });
    }

    const planInfo = PLAN_DEFINITIONS[planId] || PLAN_DEFINITIONS.premium;
    const hostOrigin = req.headers.origin || `http://${req.headers.host || 'localhost:3000'}`;

    const effectiveSuccessUrl = successUrl 
      ? successUrl.replace('{CHECKOUT_SESSION_ID}', '{CHECKOUT_SESSION_ID}')
      : `${hostOrigin}/success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`;

    const effectiveCancelUrl = cancelUrl || `${hostOrigin}/pricing`;

    // 1. Récupère ou crée le Stripe Customer ID
    let customerId = serverStore.stripeCustomers[userId];

    if (!customerId) {
      try {
        const existingCustomers = await activeStripe.customers.list({ email: userEmail, limit: 1 });
        if (existingCustomers.data.length > 0) {
          customerId = existingCustomers.data[0].id;
        } else {
          const newCustomer = await activeStripe.customers.create({
            email: userEmail,
            name: userId,
            metadata: {
              supabase_user_id: userId,
              app: 'Major2I.A',
            },
          });
          customerId = newCustomer.id;
        }
        serverStore.stripeCustomers[userId] = customerId;
      } catch (custErr: any) {
        console.warn('Création client Stripe optionnelle ignorée:', custErr?.message);
      }
    }

    // 2. Création de la Checkout Session Stripe
    const session = await activeStripe.checkout.sessions.create({
      ...(customerId ? { customer: customerId } : { customer_email: userEmail }),
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planInfo.name,
              description: `Abonnement ${interval === 'year' ? 'Annuel (-20%)' : 'Mensuel'} à l'Assistant IA Major2I.A Neural`,
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

    if (!session || !session.url) {
      throw new Error('Stripe n\'a pas généré d\'URL de redirection valide.');
    }

    return res.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Erreur Stripe Checkout create-checkout-session:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors de la création de la session Stripe' });
  }
}

/**
 * Route: POST /api/create-checkout-session & /api/stripe/create-checkout-session
 * Compatible Vercel, Node.js et Express
 */
app.post('/api/create-checkout-session', handleCreateCheckoutSession);
app.post('/api/stripe/create-checkout-session', handleCreateCheckoutSession);

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
 * Route 3: POST /api/stripe/verify-session & /api/verify-session
 * Vérifie le statut de la session Checkout et synchronise les droits dans Supabase
 */
async function handleVerifySession(req: Request, res: Response) {
  try {
    const { sessionId, userId: explicitUserId } = req.body;
    const { userId: authUserId, userEmail } = await authenticateSupabaseUser(req);
    const userId = explicitUserId || authUserId;

    const activeStripeKey = process.env.STRIPE_SECRET_KEY || '';
    const activeStripe = stripe || (activeStripeKey.trim() !== '' ? new Stripe(activeStripeKey.trim(), { apiVersion: '2025-02-24.acacia' as any }) : null);

    let planId = 'premium';
    let interval = 'month';
    let stripeCustomerId = '';
    let stripeSubscriptionId = '';

    if (activeStripe && sessionId && sessionId.startsWith('cs_') && !sessionId.startsWith('cs_test_mock_')) {
      try {
        const session = await activeStripe.checkout.sessions.retrieve(sessionId, {
          expand: ['subscription', 'customer'],
        });

        // Strict payment check: verify that Stripe marks the session as paid or complete
        if (session.payment_status !== 'paid' && session.status !== 'complete') {
          return res.status(400).json({
            success: false,
            error: 'Le paiement n\'a pas encore été validé par Stripe. Veuillez compléter votre règlement.',
          });
        }

        planId = session.metadata?.planId || 'premium';
        interval = session.metadata?.interval || 'month';
        stripeCustomerId = typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id || '';
        stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : (session.subscription as any)?.id || '';
      } catch (e: any) {
        console.warn('Session retrieval fallback:', e);
        return res.status(400).json({
          success: false,
          error: e?.message || 'Impossible de vérifier la session Stripe.',
        });
      }
    } else {
      // Mock or simulation parameters with validation
      planId = req.body?.planId || 'premium';
      interval = req.body?.interval || 'month';
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
}

app.post('/api/stripe/verify-session', handleVerifySession);
app.post('/api/verify-session', handleVerifySession);

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
  const currentText = (message || '').trim() || (currentParts.length > 0 ? "Analyse de cette image." : "Bonjour Major2I.A.");
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

// ASSISTANT CHAT INTELLIGENT AVEC GEMINI & GOOGLE SEARCH (STREAMING & GROUNDING EN TEMPS RÉEL)
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, image, history, userProfile, stream = true } = req.body;

    if (!message && !image) {
      return res.status(400).json({ error: 'Message ou image requis' });
    }

    const userName = (userProfile?.prenom ? `${userProfile.prenom} ${userProfile.nom || ''}`.trim() : userProfile?.userName) || '';
    const userGreetingInstruction = userName 
      ? `L'utilisateur avec qui tu discutes s'appelle "${userName}".`
      : "";

    const systemInstruction = `Tu es Major2I.A, un assistant d'intelligence artificielle hautement performant, précis, direct, naturel et chaleureux.
${userGreetingInstruction}

DIRECTIVES DE RÉPONSE :
1. Réponds avec une exactitude maximale et un grand souci du détail à la question posée.
2. Formule ta réponse de manière fluide, vivante et concrète, sans préambule superflu, sans répéter inutilement la date du jour en introduction sauf si l'utilisateur la demande explicitement ou si c'est indispensable pour le contexte temporel.
3. Exploite pleinement les informations en temps réel de la recherche Google pour les faits d'actualité, la météo, les événements et données récentes en te basant sur la temporalité réelle actuelle.
4. Évite toute structure rigide ou scolaire de type "Définition / Contexte / Analyse". Va droit au but avec un ton naturel.
5. GESTION AUTOMATIQUE DES ENREGISTREMENTS DANS LE MENU :
   Si l'utilisateur te demande de noter, enregistrer, programmer, rappeler, ajouter une tâche, retenir ou mettre en favori (ex: "note que...", "ajoute dans le menu...", "rappelle-moi...", "crée une tâche...", "mémorise..."), tu DOIS TOUJOURS inclure à la toute fin de ton message le bloc JSON structuré sous ce format exact :
   Pour un rappel :
   ACTION_JSON:{"actions":[{"type":"reminder","titre":"...","dateRappel":"YYYY-MM-DD","heure":"HH:MM","priorite":"haute"}]}
   Pour une tâche :
   ACTION_JSON:{"actions":[{"type":"task","titre":"...","priorite":"normale"}]}
   Pour une note mémorisée :
   ACTION_JSON:{"actions":[{"type":"memory","contenu":"...","importance":3}]}
   Pour un favori :
   ACTION_JSON:{"actions":[{"type":"favorite","titre":"...","contenu":"..."}]}
   Si aucune action d'enregistrement n'est demandée, ne produis aucun bloc ACTION_JSON.`.trim();

    const contents = buildGeminiContents(history, message || '', image);
    const ai = getGenAI();

    const needsLiveSearch = Boolean(
      !image &&
      message &&
      /(?:cherche|search|google|météo|meteo|actualit|nouvelle|news|qui est|score|match|cours|prix|aujourd'hui|ce jour|date|heure|en direct|récent|2026|direct)/i.test(
        message
      )
    );

    const config: any = {
      systemInstruction,
      temperature: 0.7,
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
    };

    if (needsLiveSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    // Set SSE headers for streaming response
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    let streamResponse: any = null;
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest'];

    for (const modelName of candidateModels) {
      try {
        const currentConfig = { ...config };
        if (modelName === 'gemini-3.1-flash-lite') {
          currentConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
        }
        streamResponse = await withTimeout(
          ai.models.generateContentStream({
            model: modelName,
            contents,
            config: currentConfig,
          }),
          8000,
          `Timeout model ${modelName}`
        );
        if (streamResponse) break;
      } catch (err: any) {
        console.warn(`Tentative streaming serveur ${modelName} a échoué:`, err?.message || err);
      }
    }

    // Fallback attempt without tools if search tool caused any transient issue
    if (!streamResponse) {
      for (const fallbackModel of ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest']) {
        try {
          streamResponse = await withTimeout(
            ai.models.generateContentStream({
              model: fallbackModel,
              contents,
              config: {
                systemInstruction,
                temperature: 0.7,
                thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
              },
            }),
            8000,
            `Timeout fallback model ${fallbackModel}`
          );
          if (streamResponse) break;
        } catch (fallbackErr: any) {
          console.warn(`Fallback streaming ${fallbackModel} a échoué:`, fallbackErr?.message || fallbackErr);
        }
      }
    }

    if (!streamResponse) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: "Impossible de joindre le modèle d'IA." })}\n\n`);
      res.end();
      return;
    }

    let fullText = '';
    const rawSources: { title: string; uri: string }[] = [];
    const searchQueries: string[] = [];

    for await (const chunk of streamResponse) {
      const chunkText = chunk.text || '';
      if (chunkText) {
        fullText += chunkText;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }

      const groundingMeta = chunk?.candidates?.[0]?.groundingMetadata;
      if (groundingMeta) {
        if (Array.isArray(groundingMeta.groundingChunks)) {
          for (const gc of groundingMeta.groundingChunks) {
            if (gc.web?.uri) {
              rawSources.push({
                title: gc.web.title || gc.web.uri,
                uri: gc.web.uri,
              });
            }
          }
        }
        if (Array.isArray(groundingMeta.webSearchQueries)) {
          for (const q of groundingMeta.webSearchQueries) {
            if (typeof q === 'string' && q.trim()) {
              searchQueries.push(q.trim());
            }
          }
        }
      }
    }

    let reply = fullText.trim();
    let actions: any[] = [];

    // 1. Extract ACTION_JSON if present in any format (code block, bare JSON, multiline)
    const jsonRegexes = [
      /ACTION_JSON\s*:\s*```(?:json)?\s*([\s\S]*?)\s*```/i,
      /ACTION_JSON\s*:\s*(\{[\s\S]*?\})/i,
      /\[ACTION_JSON\]\s*(\{[\s\S]*?\})/i,
      /```json\s*(\{\s*"actions"[\s\S]*?\})\s*```/i
    ];

    for (const regex of jsonRegexes) {
      const match = fullText.match(regex);
      if (match && match[1]) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
            actions = parsed.actions;
            break;
          }
        } catch {
          // Continue to next regex or fallback
        }
      }
    }

    // Clean ACTION_JSON remnants from display text
    reply = fullText
      .replace(/ACTION_JSON\s*:\s*```(?:json)?[\s\S]*?```/gi, '')
      .replace(/(?:Rappel|Tâche|Mémoire|Favori)?\s*:?\s*ACTION_JSON\s*:?\s*\{[\s\S]*?\}/gi, '')
      .replace(/(?:Rappel|Tâche|Mémoire|Favori)?\s*:?\s*ACTION_JSON\s*:[\s\S]*/gi, '')
      .replace(/(?:\r?\n)*(?:Rappel|Tâche|Mémoire|Favori)\s*:\s*$/i, '')
      .trim();

    // 2. Intelligent Server Fallback: If Gemini did not generate ACTION_JSON, detect user intent
    if (actions.length === 0 && message) {
      const cleanPrompt = message.trim();
      const norm = cleanPrompt
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[’']/g, ' ')
        .trim();
      const lower = cleanPrompt.toLowerCase();
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Reminder detection
      if (
        norm.startsWith('rappel') ||
        norm.includes('rappelle moi') ||
        norm.includes('rappelle-moi') ||
        norm.includes('rappeler de') ||
        norm.includes('peux tu me rappeler') ||
        norm.includes('pourrais tu me rappeler') ||
        norm.includes('ajoute un rappel') ||
        norm.includes('cree un rappel') ||
        norm.includes('programme un rappel') ||
        norm.includes('mets une alerte') ||
        norm.includes('mets une alarme') ||
        norm.includes('n oublie pas de me rappeler')
      ) {
        let reminderTitle = cleanPrompt
          .replace(/^(bonjour|salut|peux-tu|peux tu|pourrais-tu|pourrais tu|s il te plait|svp)?\s*(rappel|rappelle-moi|rappelle moi|me rappeler de|rappeler de|ajoute un rappel|ajouter un rappel|crée un rappel|créer un rappel|programme un rappel|programmer un rappel|mets une alerte pour|mets une alarme pour|n'oublie pas de me rappeler)\s*:?\s*/i, '')
          .replace(/^(de|que|pour|à|a)\s+/i, '')
          .trim();

        let reminderHour = '09:00';
        const timeMatch = lower.match(/(?:à|vers|a|pour)\s*(\d{1,2})[h:]?(\d{2})?/i);
        if (timeMatch) {
          reminderHour = `${timeMatch[1].padStart(2, '0')}:${(timeMatch[2] || '00').padStart(2, '0')}`;
        }

        let reminderDate = todayStr;
        if (norm.includes('demain')) {
          const d = new Date(now);
          d.setDate(d.getDate() + 1);
          reminderDate = d.toISOString().split('T')[0];
        } else if (norm.includes('apres demain') || norm.includes('apres-demain')) {
          const d = new Date(now);
          d.setDate(d.getDate() + 2);
          reminderDate = d.toISOString().split('T')[0];
        }

        reminderTitle = reminderTitle.replace(/(?:demain|après-demain|apres-demain|aujourd'hui|(?:à|vers|pour|a)\s*\d{1,2}[h:]?\d{0,2})/gi, '').trim();
        if (!reminderTitle) reminderTitle = 'Rappel programmé';

        actions.push({
          type: 'reminder',
          titre: reminderTitle,
          description: `Rappel créé pour le ${reminderDate} à ${reminderHour}`,
          dateRappel: reminderDate,
          heure: reminderHour,
          priorite: norm.includes('urgent') || norm.includes('important') ? 'haute' : 'normale',
        });
      }
      // Task detection
      else if (
        norm.startsWith('tache') ||
        norm.startsWith('todo') ||
        norm.includes('ajoute une tache') ||
        norm.includes('cree une tache') ||
        norm.includes('nouvelle tache') ||
        norm.includes('ajoute dans mes taches') ||
        norm.includes('ajoute dans les taches') ||
        norm.includes('ajoute a faire')
      ) {
        let taskTitle = cleanPrompt
          .replace(/^(bonjour|salut|peux-tu|peux tu|pourrais-tu|pourrais tu|s il te plait|svp)?\s*(tâche|tache|todo|ajoute une tâche|ajouter une tâche|crée une tâche|créer une tâche|nouvelle tâche|rajoute une tâche|ajoute dans les tâches|ajoute dans mes tâches|ajoute à faire)\s*:?\s*/i, '')
          .replace(/^(de|pour|qui consiste à|dans le menu|dans mes tâches)\s+/i, '')
          .trim();

        if (!taskTitle) taskTitle = 'Nouvelle tâche';

        actions.push({
          type: 'task',
          titre: taskTitle,
          description: `Tâche créée par Major2I.A`,
          priorite: norm.includes('urgent') || norm.includes('important') ? 'haute' : 'normale',
        });
      }
      // Memory / Note detection
      else if (
        norm.startsWith('note ') ||
        norm.startsWith('note que') ||
        norm.startsWith('note ceci') ||
        norm.startsWith('note ca') ||
        norm.startsWith('note:') ||
        norm.startsWith('note :') ||
        norm.includes('note dans le menu') ||
        norm.includes('note dans la memoire') ||
        norm.includes('note dans ma memoire') ||
        norm.includes('note-moi') ||
        norm.includes('note moi') ||
        norm.includes('peux tu noter') ||
        norm.includes('peux-tu noter') ||
        norm.includes('pourrais tu noter') ||
        norm.includes('pourrais-tu noter') ||
        norm.includes('je veux que tu notes') ||
        norm.includes('garde en note') ||
        norm.includes('garde en memoire') ||
        norm.includes('garde en tete') ||
        norm.includes('garde ceci') ||
        norm.startsWith('memoire') ||
        norm.includes('memorise') ||
        norm.includes('memoriser') ||
        norm.includes('retiens que') ||
        norm.includes('souviens toi') ||
        norm.includes('souviens-toi') ||
        norm.includes('enregistre en memoire') ||
        norm.includes('enregistre dans la memoire') ||
        norm.includes('enregistre dans le menu') ||
        norm.includes('enregistre cette note') ||
        norm.includes('mets en memoire') ||
        norm.includes('sauvegarde en memoire') ||
        norm.includes('ajoute a mes notes') ||
        norm.includes('ajoute dans mes notes')
      ) {
        let memoContent = cleanPrompt
          .replace(/^(bonjour|salut|peux-tu|peux tu|pourrais-tu|pourrais tu|s il te plait|svp)?\s*(note dans le menu que|note dans le menu|note dans ma mémoire que|note dans ma mémoire|note-moi que|note moi que|note-moi|note moi|note que|note ceci|note ça|note :|note:|note|mémoire|memoire|mémorise|mémoriser|garde en mémoire que|garde en mémoire|garde en tête|garde en note|garde ceci|retiens que|souviens-toi de|souviens toi de|enregistre en mémoire|enregistre dans la mémoire|enregistre dans le menu|enregistre cette note|mets en mémoire|sauvegarde en mémoire|ajoute à mes notes|ajoute dans mes notes)\s*:?\s*/i, '')
          .replace(/^(de|que|pour|ceci|cela)\s+/i, '')
          .trim();

        if (!memoContent) memoContent = cleanPrompt;

        actions.push({
          type: 'memory',
          contenu: memoContent,
          tags: ['ia-auto', 'mémoire', 'menu'],
          importance: 4,
        });
      }
    }

    // Deduplicate sources
    const uniqueSources: { title: string; uri: string }[] = [];
    const seenUris = new Set<string>();
    for (const s of rawSources) {
      if (s.uri && !seenUris.has(s.uri)) {
        seenUris.add(s.uri);
        uniqueSources.push(s);
      }
    }

    res.write(`data: ${JSON.stringify({
      type: 'done',
      reply: reply || "Transmission reçue.",
      actions,
      sources: uniqueSources,
      searchQueries: Array.from(new Set(searchQueries)),
      shouldSpeak: false,
      timestamp: new Date().toISOString(),
    })}\n\n`);

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Erreur globale API Chat Streaming:', error);
    try {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error?.message || "Une erreur est survenue lors de la génération de la réponse.",
      })}\n\n`);
      res.end();
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ error: "Une erreur est survenue lors de la génération de la réponse." });
      }
    }
  }
});

// SYSTEM INSTRUCTION OFFICIELLE MAJOR I.A - ASSISTANT PERSONNEL MOBILE & DEEP LINKS
export const MOBILE_ASSISTANT_SYSTEM_INSTRUCTION = `Tu es l'intelligence artificielle d'un assistant personnel intégré dans une PWA multiplateforme (iOS / Android) .
Tu dois détecter automatiquement la langue de l'utilisateur (FR ou EN) .
Ton rôle est de traduire l'instruction de l'utilisateur en un Deep Link (URL Scheme) pour ouvrir l'application demandée sur son téléphone.
RÈGLE ABSOLUE : Tu dois IMPÉRATIVEMENT répondre UNIQUEMENT avec un objet JSON strict contenant TOUJOURS les deux champs suivants, sans jamais les omettre, sans aucun texte d'introduction et sans balises Markdown autour :
{
"feedback_speech": "Phrase courte confirmant l'action dans la langue de l'utilisateur (FR ou EN).",
"url": "L'URL ou le Schema à ouvrir sur le téléphone (string) ou null s'il n'y a aucune application à lancer."
}
Règles pour remplir le champ "url" :
Si l'utilisateur nomme une application, génère son Schema URL standard (ex: "spotify:search:[mots]", "instagram://", "https://wa.me/[numero]?text=[message]", etc.).
Pour les actions système :
-Appeler : "tel:[numero]"
-SMS : "sms:[numero]?body=[texte]"
-Email : "mailto:[email]"
-GPS / Carte : "https://www.google.com/maps/search/?api=1&query=[lieu]"
Si l'application exacte n'a pas de Schema connu ou pour une recherche globale, utilise : "https://www.google.com/search?q=[mots_cles]"
Si c'est une simple discussion ou une salutation, mets "url": null.
Format de sortie : JSON brut uniquement.`;

// HANDLER ASSISTANT MOBILE & DEEP LINKS
async function handleMobileAssistantDeepLink(req: Request, res: Response) {
  try {
    const message = (req.body?.message || req.body?.instruction || req.body?.prompt || '').trim();

    if (!message) {
      return res.json({
        feedback_speech: "Veuillez formuler une demande ou commande.",
        url: null
      });
    }

    const ai = getGenAI();
    let response: any = null;
    const candidateModels = ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

    for (const modelName of candidateModels) {
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: message }] }],
            config: {
              systemInstruction: MOBILE_ASSISTANT_SYSTEM_INSTRUCTION,
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
          15000,
          `Délai dépassé pour ${modelName}`
        );

        const rawText = response?.text || response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('').trim();
        if (rawText && rawText.length > 0) {
          try {
            // Nettoyage Markdown si présent
            const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
            const parsed = JSON.parse(cleaned);
            if (parsed && typeof parsed.feedback_speech === 'string' && (typeof parsed.url === 'string' || parsed.url === null)) {
              return res.json({
                feedback_speech: parsed.feedback_speech,
                url: parsed.url,
              });
            }
          } catch {}
        }
      } catch (err: any) {
        console.warn(`Mobile assistant deep link err with ${modelName}:`, err?.message || err);
      }
    }

    // Heuristic Fallback in case of temporary offline/timeout
    const lower = message.toLowerCase();
    const isEn = /^(open|call|text|send|navigate|where|search|play)\b/i.test(lower);

    // Call
    const telMatch = message.match(/(?:appelle|téléphone|call)\s+(?:le\s+)?([+\d\s.-]{6,})/i);
    if (telMatch) {
      const cleanNum = telMatch[1].replace(/[\s.-]/g, '');
      return res.json({
        feedback_speech: isEn ? `Calling ${cleanNum}...` : `Appel vers le ${cleanNum} en cours...`,
        url: `tel:${cleanNum}`,
      });
    }

    // SMS
    const smsMatch = message.match(/(?:sms|message|texte)\s+(?:à|au|to)\s+([+\d\s.-]{6,})/i);
    if (smsMatch) {
      const cleanNum = smsMatch[1].replace(/[\s.-]/g, '');
      return res.json({
        feedback_speech: isEn ? `Opening SMS to ${cleanNum}...` : `Ouverture du message pour le ${cleanNum}...`,
        url: `sms:${cleanNum}`,
      });
    }

    // GPS
    if (/(?:gps|carte|itinéraire|guide|navigate|route|aller à|directions to)\b/i.test(lower)) {
      const query = encodeURIComponent(message.replace(/^(?:gps|itinéraire vers|guide-moi vers|directions to|route to)\s+/i, ''));
      return res.json({
        feedback_speech: isEn ? "Opening GPS navigation..." : "Lancement du guidage GPS...",
        url: `https://www.google.com/maps/search/?api=1&query=${query}`,
      });
    }

    // Spotify
    if (/(?:spotify|musique|chanson|play|écoute)\b/i.test(lower)) {
      const track = encodeURIComponent(message.replace(/^(?:lance spotify|joue|mets|play)\s+/i, ''));
      return res.json({
        feedback_speech: isEn ? "Opening Spotify..." : "Lancement de Spotify...",
        url: `spotify:search:${track}`,
      });
    }

    // Default Fallback
    return res.json({
      feedback_speech: isEn ? "Here is the result of your request." : "Voici le résultat de votre demande.",
      url: lower.length > 3 ? `https://www.google.com/search?q=${encodeURIComponent(message)}` : null,
    });

  } catch (error: any) {
    console.error('Erreur API Mobile Assistant:', error);
    return res.status(500).json({
      feedback_speech: "Une erreur est survenue lors de l'exécution de la commande.",
      url: null
    });
  }
}

// Endpoints pour l'assistant mobile & Deep Links
app.post('/api/assistant/deep-link', handleMobileAssistantDeepLink);
app.post('/api/deep-link', handleMobileAssistantDeepLink);
app.post('/api/mobile-assistant', handleMobileAssistantDeepLink);

// TRANSCRIPTION AUDIO / VOIX ENDPOINT (GEMINI MULTIMODAL HIGH-ACCURACY)
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType, language } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Données audio requises (base64)' });
    }

    // Extract raw base64 data reliably
    let base64 = audioData;
    let type = mimeType || 'audio/webm';
    if (typeof audioData === 'string' && audioData.includes('base64,')) {
      const parts = audioData.split('base64,');
      base64 = parts[1];
      const header = parts[0];
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch) {
        type = mimeMatch[1];
      }
    } else if (typeof audioData === 'string' && audioData.startsWith('data:')) {
      const commaIdx = audioData.indexOf(',');
      if (commaIdx !== -1) {
        base64 = audioData.slice(commaIdx + 1);
      }
    }
    base64 = (base64 || '').replace(/\s+/g, '');

    // Normalize mime type for Gemini supported audio codecs
    let cleanType = (type || '').split(';')[0].trim().toLowerCase();
    if (cleanType === 'audio/x-m4a' || cleanType === 'audio/m4a' || cleanType === 'audio/mp4a-latm') cleanType = 'audio/mp4';
    if (cleanType === 'audio/wave' || cleanType === 'audio/x-wav') cleanType = 'audio/wav';
    if (cleanType === 'audio/ogg' || cleanType === 'audio/vorbis' || cleanType === 'audio/opus') cleanType = 'audio/ogg';
    if (cleanType === 'audio/mpeg' || cleanType === 'audio/mp3') cleanType = 'audio/mp3';
    if (cleanType === 'audio/webm' || cleanType.startsWith('audio/webm')) cleanType = 'audio/webm';
    if (!cleanType || !cleanType.startsWith('audio/')) cleanType = 'audio/webm';

    const ai = getGenAI();
    const promptText = `Écoute cet enregistrement audio et retranscris fidèlement, mot pour mot et avec exactitude chaque parole prononcée en ${language || 'français'}. Rends UNIQUEMENT le texte exact dit, sans ajouter de guillemets, d'introduction, d'explication ou de commentaire. S'il n'y a aucune parole ou uniquement du silence, réponds simplement : [SILENCE].`;

    let response: any = null;
    const transcribeModels = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

    for (const modelName of transcribeModels) {
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: cleanType,
                      data: base64
                    }
                  },
                  { text: promptText }
                ]
              }
            ],
            config: {
              temperature: 0.0,
              maxOutputTokens: 1024,
            }
          }),
          15000,
          `Timeout transcription ${modelName}`
        );
        if (response && response.text && response.text.trim().length > 0) {
          break;
        }
      } catch (err: any) {
        console.warn(`Tentative transcription (${modelName}) :`, err?.message || err);
      }
    }

    let rawText = response?.text?.trim() || '';
    // Strip surrounding quotes or prefixes
    rawText = rawText.replace(/^["'«»]+|["'«»]+$/g, '').trim();
    rawText = rawText.replace(/^(transcription|texte transcrit|résultat)\s*:\s*/i, '').trim();
    if (rawText.toUpperCase() === '[SILENCE]' || rawText.toUpperCase() === 'SILENCE' || rawText.toLowerCase() === 'silence.') {
      rawText = '';
    }

    return res.json({
      success: true,
      transcription: rawText,
      language: language || 'fr',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Erreur API Transcription:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Erreur lors de la transcription audio',
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
    console.log(`⚡ Serveur Major2I.A [Neural Edition] actif sur http://0.0.0.0:${PORT}`);
  });
}

startServer();

