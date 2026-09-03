import { loadStripe, Stripe } from '@stripe/stripe-js';
import { getSupabaseClient } from './supabase';
import { getAuthRedirectUrl } from './supabaseAuth';
import { SubscriptionPlan, BillingInterval, UserSubscription } from '../types';

// Stripe Publishable Key from Vite environment (reads VITE_STRIPE_PUBLIC_KEY)
const STRIPE_PUBLISHABLE_KEY = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_STRIPE_PUBLIC_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' && (process as any).env?.VITE_STRIPE_PUBLIC_KEY) ||
  (typeof process !== 'undefined' && (process as any).env?.VITE_STRIPE_PUBLISHABLE_KEY) ||
  'pk_test_51MockStripeKeyForMajorIADevelopment0000000000000000000000000000000000000000000000000000000000000000';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Initialize or get the official Stripe instance
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}

/**
 * Definition of the 4 subscription plans for Major2I.A with -20% annual discount
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Formule Essentielle',
    monthlyPrice: 9.90,
    annualMonthlyPrice: 7.92, // 20% discount (7.92€/mois soit 95.04€/an)
    periodLabel: '/ mois',
    stripePriceIdMonthly: 'prod_VB7Scc3ukmNPjc',
    stripePriceIdAnnual: 'prod_VBVHIF698m6dOd',
    batteryCapacity: '100% Autonomie / mois',
    energyPercentValue: 100,
    dotColor: 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] border border-blue-300',
    badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-500/50',
    cardBorder: 'border-blue-500/30 hover:border-blue-400 bg-white/[0.03]',
    buttonBg: 'bg-blue-600/90 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30',
    features: [
      'Capacité IA 100% par mois',
      '🔄 Report automatique de l\'énergie non utilisée',
      'Assistant IA conversationnel complet (Gemini Flash)',
      'Gestion des Tâches, Rappels & Agenda synchronisé',
      'Recherche web essentielle & Synthèse vocale'
    ]
  },
  {
    id: 'premium',
    name: 'Formule Performance',
    monthlyPrice: 19.90,
    annualMonthlyPrice: 15.92, // 20% discount (15.92€/mois soit 191.04€/an)
    periodLabel: '/ mois',
    stripePriceIdMonthly: 'prod_VB7YBUiYmZ5Z2a',
    stripePriceIdAnnual: 'prod_VBVJkObS2SNsbg',
    batteryCapacity: '250% Autonomie / mois',
    energyPercentValue: 250,
    dotColor: 'bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.8)] border border-purple-300',
    badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-500/50',
    cardBorder: 'border-purple-500/50 hover:border-purple-400 bg-purple-950/[0.08] shadow-[0_0_25px_rgba(168,85,247,0.15)]',
    buttonBg: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40',
    popular: true,
    features: [
      'Capacité IA 250% par mois',
      '🔄 Report illimité de la IA restante',
      'IA Haute Vitesse & Analyse Documents/Images',
      'Recherche Google en direct & sources web vérifiées',
      'Pont Mobile smartphone & Notifications push synchronisées',
      'Priorité de bande passante aux heures de pointe'
    ]
  },
  {
    id: 'pro',
    name: 'Formule Illimitée Pro',
    monthlyPrice: 39.90,
    annualMonthlyPrice: 31.92, // 20% discount (31.92€/mois soit 383.04€/an)
    periodLabel: '/ mois',
    stripePriceIdMonthly: 'prod_VB7dquHsjl0tYE',
    stripePriceIdAnnual: 'prod_VBVLOJW8tOvqYt',
    batteryCapacity: 'IA Illimitée Max',
    energyPercentValue: 500,
    dotColor: 'bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.9)] border border-rose-300',
    badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
    cardBorder: 'border-rose-500/40 hover:border-rose-400 bg-rose-950/[0.05]',
    buttonBg: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-900/40',
    features: [
      'Autonomie maximale sans restriction de charge',
      '🔄 Report perpétuel de toute l\'énergie acquise',
      'Modèles IA de pointe (Gemini 2.5 Flash & 2.5 Pro)',
      'Synthèse vocale Ultra HD (Voix Homme / Femme)',
      'Intégrations API avancées & Transcriptions audio',
      'Accompagnement & Support VIP prioritaire 24/7'
    ]
  },
  {
    id: 'custom',
    name: 'Sur mesure Entreprise',
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    periodLabel: '',
    batteryCapacity: 'Infrastructure dédiée SLA 99.9%',
    energyPercentValue: 1000,
    dotColor: 'bg-neutral-800 border border-slate-500',
    badgeBg: 'bg-slate-900 text-slate-200 border-slate-600',
    cardBorder: 'border-slate-700/50 hover:border-slate-500 bg-white/[0.02]',
    buttonBg: 'bg-white/10 hover:bg-white/20 text-white border-[0.5px] border-white/20',
    features: [
      'Serveurs dédiés & ponts mobiles sur mesure',
      'Intégration API & SSO d\'entreprise personnalisé',
      'Personnalisation complète de l\'agent neural',
      'Garantie de service, chiffrement dédié et SLA entreprise'
    ]
  }
];

/**
 * Get current Supabase Auth access token or local user identifier
 */
export async function getAuthHeader(): Promise<{ token?: string; userId: string; userEmail?: string }> {
  let token: string | undefined;
  let userEmail: string | undefined;
  
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        token = data.session.access_token;
        userEmail = data.session.user?.email;
        if (data.session.user?.id) {
          return { token, userId: data.session.user.id, userEmail };
        }
      }
    } catch {}
  }

  // Fallback to local auth
  const localUser = (typeof window !== 'undefined' && localStorage.getItem('neo-auth-user')) || 'user_anonymous';
  const localProfile = typeof window !== 'undefined' ? localStorage.getItem('neo-user-profile') : null;
  if (localProfile) {
    try {
      const parsed = JSON.parse(localProfile);
      if (parsed.email) userEmail = parsed.email;
    } catch {}
  }

  return { token, userId: localUser, userEmail };
}

/**
 * Create Stripe Checkout Session for subscription
 */
export async function createCheckoutSession(params: {
  planId: string;
  interval: BillingInterval;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<{ url: string; sessionId?: string; isSimulated?: boolean }> {
  const { token, userId, userEmail } = await getAuthHeader();

  const baseOrigin = getAuthRedirectUrl();
  const successUrl = params.successUrl || `${baseOrigin}/success?session_id={CHECKOUT_SESSION_ID}&plan=${params.planId}`;
  const cancelUrl = params.cancelUrl || `${baseOrigin}/pricing`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const payload = {
    planId: params.planId,
    interval: params.interval,
    userId,
    userEmail,
    successUrl,
    cancelUrl,
  };

  let response: Response;
  try {
    response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.status === 404) {
      // Fallback to Express router path if needed
      response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    }
  } catch (netErr: any) {
    console.error('Erreur réseau Stripe Checkout:', netErr);
    throw new Error('Impossible de contacter le serveur de paiement. Vérifiez votre connexion Internet.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Erreur serveur HTTP ${response.status}` }));
    const errorMessage = errorData.error || errorData.message || `Erreur (${response.status})`;
    console.error('Erreur retournée par l\'API Stripe Checkout:', errorMessage, errorData);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  if (!data || !data.url) {
    console.error('Réponse invalide de l\'API Stripe:', data);
    throw new Error('Stripe n\'a pas retourné d\'URL de redirection valide.');
  }

  return data;
}

/**
 * Create Stripe Customer Billing Portal Session
 */
export async function createCustomerPortalSession(params?: { returnUrl?: string }): Promise<{ url: string }> {
  const { token, userId, userEmail } = await getAuthHeader();
  const returnUrl = params?.returnUrl || `${getAuthRedirectUrl()}/pricing`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/stripe/create-portal-session', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      userId,
      userEmail,
      returnUrl,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Impossible d\'ouvrir le portail de facturation' }));
    throw new Error(errorData.error || `Erreur (${response.status})`);
  }

  return response.json();
}

/**
 * Verify and refresh subscription from checkout session ID
 */
export async function verifyCheckoutSession(
  sessionId: string,
  extra?: { planId?: string; interval?: BillingInterval }
): Promise<{
  success: boolean;
  subscription?: UserSubscription;
  planId?: string;
  energyPercent?: number;
  message?: string;
}> {
  const { token, userId } = await getAuthHeader();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/stripe/verify-session', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sessionId,
      userId,
      planId: extra?.planId,
      interval: extra?.interval,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Échec de vérification du paiement' }));
    throw new Error(errorData.error || 'Vérification Stripe impossible');
  }

  return response.json();
}

/**
 * Get active user subscription from Supabase or backend
 */
export async function fetchUserSubscription(userId?: string): Promise<UserSubscription | null> {
  const effectiveUserId = userId || (await getAuthHeader()).userId;
  if (!effectiveUserId || effectiveUserId === 'user_anonymous') {
    return null;
  }

  // 1. Direct Supabase query if client available
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error && (data.status === 'active' || data.status === 'trialing')) {
        return {
          id: data.id,
          userId: data.user_id,
          planId: data.plan_id,
          planName: data.plan_name,
          status: data.status,
          interval: data.interval || 'month',
          currentPeriodEnd: data.current_period_end,
          cancelAtPeriodEnd: data.cancel_at_period_end,
          stripeCustomerId: data.stripe_customer_id,
          stripeSubscriptionId: data.stripe_subscription_id,
        };
      }
    } catch (err) {
      console.warn('Erreur Supabase lecture abonnement:', err);
    }
  }

  // 2. Fetch from backend API
  try {
    const res = await fetch(`/api/stripe/subscription?userId=${encodeURIComponent(effectiveUserId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.subscription) {
        return data.subscription;
      }
    }
  } catch {}

  // 3. Fallback to localStorage saved subscription
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(`neo-user-sub-${effectiveUserId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
  }

  return null;
}
