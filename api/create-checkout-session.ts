import Stripe from 'stripe';

const PLAN_DEFINITIONS: Record<string, { name: string; amountMonth: number; amountYear: number; energy: number }> = {
  basic: { name: 'Formule Essentielle (Major2I.A)', amountMonth: 990, amountYear: 9504, energy: 100 },
  premium: { name: 'Formule Performance (Major2I.A)', amountMonth: 1990, amountYear: 19104, energy: 250 },
  pro: { name: 'Formule Illimitée Pro (Major2I.A)', amountMonth: 3990, amountYear: 38304, energy: 500 },
};

/**
 * Serverless Function compatible with Vercel and Node.js hosting.
 * Handles POST /api/create-checkout-session
 */
export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Seul le verbe POST est accepté.' });
  }

  try {
    // 1. Read process.env.STRIPE_SECRET_KEY
    const stripeSecretKey = 
      process.env.STRIPE_SECRET_KEY || 
      (typeof import.meta !== 'undefined' ? (import.meta as any).env?.STRIPE_SECRET_KEY : '') ||
      '';

    if (!stripeSecretKey || stripeSecretKey.trim() === '') {
      console.error('Erreur: La variable d\'environnement STRIPE_SECRET_KEY n\'est pas définie.');
      return res.status(500).json({
        error: 'Configuration Stripe manquante sur le serveur : variable STRIPE_SECRET_KEY non renseignée dans les variables d\'environnement.',
      });
    }

    const stripe = new Stripe(stripeSecretKey.trim(), {
      apiVersion: '2025-02-24.acacia' as any,
    });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { planId = 'premium', interval = 'month', successUrl, cancelUrl, userId, userEmail } = body;

    const planInfo = PLAN_DEFINITIONS[planId] || PLAN_DEFINITIONS.premium;

    // Determine host origin for fallback redirects
    const hostOrigin = req.headers?.origin || 
      (req.headers?.host ? `https://${req.headers.host}` : 'http://localhost:3000');

    const effectiveSuccessUrl = successUrl 
      ? successUrl.replace('{CHECKOUT_SESSION_ID}', '{CHECKOUT_SESSION_ID}')
      : `${hostOrigin}/success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`;

    const effectiveCancelUrl = cancelUrl || `${hostOrigin}/pricing`;

    const unitAmount = interval === 'year' ? planInfo.amountYear : planInfo.amountMonth;

    // 2. Initialize real Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
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
            unit_amount: unitAmount,
            recurring: {
              interval: interval === 'year' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: effectiveSuccessUrl,
      cancel_url: effectiveCancelUrl,
      customer_email: userEmail || undefined,
      metadata: {
        userId: userId || 'user_anonymous',
        userEmail: userEmail || '',
        planId,
        interval,
      },
    });

    if (!session || !session.url) {
      throw new Error('Stripe n\'a pas généré d\'URL de redirection.');
    }

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error('Erreur API /api/create-checkout-session:', error);
    return res.status(500).json({
      error: error?.message || 'Erreur lors de la création de la session Stripe Checkout.',
    });
  }
}
