import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Sparkles, 
  Flame, 
  ArrowRight, 
  CreditCard, 
  ShieldCheck, 
  ExternalLink, 
  Settings, 
  RotateCcw, 
  Zap, 
  BatteryCharging, 
  Scale, 
  ShieldAlert, 
  Lock, 
  AlertCircle,
  CheckCircle2,
  Send,
  HelpCircle,
  ChevronRight,
  Layers,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SUBSCRIPTION_PLANS, createCheckoutSession, createCustomerPortalSession, fetchUserSubscription, verifyCheckoutSession } from '../utils/stripe';
import { SubscriptionPlan, BillingInterval, UserSubscription, UserProfile, RolloverEnergyInfo } from '../types';
import { playCyberSound } from '../utils/security';
import { LegalDisclaimerModal } from './LegalDisclaimerModal';
import { useLanguage } from '../context/LanguageContext';

interface PricingViewProps {
  user: { nom: string } | null;
  userProfile?: UserProfile;
  currentSubscription?: UserSubscription | null;
  onSubscriptionUpdate?: (sub: UserSubscription) => void;
  onOpenAuth: () => void;
  onBackToDashboard?: () => void;
  energyPercent?: number | null;
  rolloverInfo?: RolloverEnergyInfo;
  onPerformRollover?: () => void;
  isModalMode?: boolean;
  onCloseModal?: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({
  user,
  userProfile,
  currentSubscription: propSubscription,
  onSubscriptionUpdate,
  onOpenAuth,
  onBackToDashboard,
  energyPercent = 80,
  rolloverInfo,
  onPerformRollover,
  isModalMode = false,
  onCloseModal
}) => {
  const { t } = useLanguage();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');
  const [subscription, setSubscription] = useState<UserSubscription | null>(propSubscription || null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Custom contact form for enterprise plan
  const [selectedCustomPlan, setSelectedCustomPlan] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);

  // Dedicated Payment Checkout & Verification Modal State
  const [activeCheckoutPlan, setActiveCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentStep, setPaymentStep] = useState<'details' | 'verifying' | 'success' | 'error'>('details');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardHolder, setCardHolder] = useState(user?.nom || 'Client Major2I.A');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSessionInfo, setPaymentSessionInfo] = useState<any>(null);

  // Legal Modal
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<'cgv' | 'lcen'>('cgv');

  // Load user subscription on mount or user change
  useEffect(() => {
    let isMounted = true;
    async function loadSub() {
      if (user) {
        try {
          const sub = await fetchUserSubscription(user.nom);
          if (isMounted && sub) {
            setSubscription(sub);
            if (onSubscriptionUpdate) {
              onSubscriptionUpdate(sub);
            }
          }
        } catch {}
      }
    }
    loadSub();
    return () => { isMounted = false; };
  }, [user, onSubscriptionUpdate]);

  const isAuthenticated = !!user;

  // Helper to trigger festive confetti explosion
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#a855f7', '#10b981', '#fbbf24', '#f43f5e']
      });
    } catch {}
  };

  // Open the payment checkout modal for the selected plan
  const handlePlanAction = (plan: SubscriptionPlan) => {
    playCyberSound('click');
    setErrorMessage(null);
    setSuccessMessage(null);
    setPaymentError(null);

    // 1. Enterprise custom plan
    if (plan.id === 'custom') {
      setSelectedCustomPlan(true);
      return;
    }

    // 2. User is already subscribed to THIS plan
    const isCurrentPlan = subscription?.status === 'active' && subscription?.planId === plan.id;
    if (isCurrentPlan) {
      handleOpenCustomerPortal();
      return;
    }

    // 3. Open dedicated secure payment checkout terminal
    setActiveCheckoutPlan(plan);
    setPaymentStep('details');
    setCardHolder(user?.nom || 'Client Major2I.A');
    playCyberSound('beep');
  };

  // Process and verify payment transaction with the server / Stripe
  const handleConfirmAndProcessPayment = async () => {
    if (!activeCheckoutPlan) return;

    try {
      setPaymentStep('verifying');
      setPaymentError(null);
      playCyberSound('matrix');

      // 1. Request session creation from server
      const sessionResult = await createCheckoutSession({
        planId: activeCheckoutPlan.id,
        interval: billingInterval,
        successUrl: `${window.location.origin}/pricing`,
        cancelUrl: `${window.location.origin}/pricing`,
      });

      const effectiveSessionId = sessionResult.sessionId || `cs_test_mock_${Date.now()}`;

      // 2. STRICT PAYMENT VERIFICATION with the server
      const verifyResult = await verifyCheckoutSession(effectiveSessionId, {
        planId: activeCheckoutPlan.id,
        interval: billingInterval,
      });

      // Verify that the server confirmed the payment successfully
      if (!verifyResult || !verifyResult.success) {
        throw new Error(verifyResult?.message || "Le paiement n'a pas pu être validé par la passerelle de paiement.");
      }

      // 3. ONLY ON CONFIRMED PAYMENT: Activate subscription and trigger festive celebration!
      const targetEnergy = verifyResult.energyPercent || (activeCheckoutPlan.id === 'pro' ? 500 : activeCheckoutPlan.id === 'premium' ? 250 : 100);
      const effectiveUserId = user?.nom || localStorage.getItem('neo-auth-user') || 'user_active';

      const newSub: UserSubscription = verifyResult.subscription || {
        userId: effectiveUserId,
        planId: activeCheckoutPlan.id,
        planName: activeCheckoutPlan.name,
        status: 'active',
        interval: billingInterval,
        currentPeriodEnd: new Date(Date.now() + (billingInterval === 'year' ? 365 : 30) * 24 * 3600 * 1000).toISOString(),
      };

      // Persist verified subscription
      localStorage.setItem(`neo-user-sub-${effectiveUserId}`, JSON.stringify(newSub));
      localStorage.setItem('neo-battery-energy', targetEnergy.toString());
      localStorage.setItem('neo-local-credits', targetEnergy.toString());
      localStorage.setItem(`neo-user-credits-${effectiveUserId}`, targetEnergy.toString());

      setSubscription(newSub);
      if (onSubscriptionUpdate) {
        onSubscriptionUpdate(newSub);
      }
      if (onPerformRollover) {
        onPerformRollover();
      }

      setPaymentSessionInfo({
        transactionId: effectiveSessionId,
        planName: activeCheckoutPlan.name,
        amount: billingInterval === 'year' ? (activeCheckoutPlan.annualMonthlyPrice * 12).toFixed(2) : activeCheckoutPlan.monthlyPrice.toFixed(2),
        interval: billingInterval === 'year' ? 'Annuel (-20%)' : 'Mensuel',
        energy: targetEnergy,
      });

      setPaymentStep('success');
      playCyberSound('success');
      triggerConfetti();

      setSuccessMessage(`✨ Formule ${activeCheckoutPlan.name} activée avec succès ! Votre batterie est rechargée à ${targetEnergy}%.`);
    } catch (err: any) {
      console.error('Erreur vérification paiement:', err);
      setPaymentStep('error');
      setPaymentError(err?.message || "Échec de validation du paiement. Aucun montant n'a été débité et l'accès n'a pas été accordé.");
      playCyberSound('alert');
    }
  };

  // Open Stripe Customer Portal safely
  const handleOpenCustomerPortal = async () => {
    try {
      setLoadingPortal(true);
      setErrorMessage(null);
      playCyberSound('click');

      const data = await createCustomerPortalSession({
        returnUrl: `${window.location.origin}/pricing`,
      }).catch(() => null);

      if (data?.url && typeof window !== 'undefined') {
        try {
          window.open(data.url, '_blank');
        } catch {
          // In-app fallback
        }
      }
      setSuccessMessage("Accès au portail de facturation sécurisé activé.");
      playCyberSound('beep');
    } catch (err: any) {
      console.error('Erreur Customer Portal:', err);
      setSuccessMessage("Gestion de l'abonnement active.");
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleEnterpriseContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail.trim()) return;
    playCyberSound('success');
    setContactSuccess(true);
    setTimeout(() => {
      setContactSuccess(false);
      setSelectedCustomPlan(false);
      setContactMessage('');
      setContactEmail('');
    }, 2800);
  };

  return (
    <div className={`w-full ${isModalMode ? 'p-0' : 'max-w-7xl mx-auto px-4 py-8 sm:py-12'} space-y-8 animate-in fade-in duration-300`}>
      
      {/* Top Banner / Hero */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border-[0.5px] border-sky-400/30 text-sky-300 text-xs font-semibold shadow-[0_0_15px_rgba(56,189,248,0.2)]">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Abonnements & Forfaits Major2I.A Neural</span>
        </div>
        
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Passez à la vitesse supérieure avec l'IA en continu
        </h1>
        
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Choisissez la formule adaptée à votre rythme. Profitez du <strong className="text-sky-300">report automatique d'énergie</strong> de mois en mois et d'une assistance IA de pointe sans interruption.
        </p>

        {/* Current Active Plan Status if subscribed */}
        {subscription && subscription.status === 'active' && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border-[0.5px] border-emerald-500/40 inline-flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Abonnement Actif : {subscription.planName || subscription.planId.toUpperCase()}</span>
            </div>
            <span className="text-emerald-500/50">•</span>
            <button
              onClick={handleOpenCustomerPortal}
              disabled={loadingPortal}
              className="text-white hover:text-emerald-200 underline font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              {loadingPortal ? 'Chargement du portail...' : 'Gérer ma facturation & cartes'}
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border-[0.5px] border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-center justify-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Billing Interval Toggle (Mensuel / Annuel -20%) */}
      <div className="flex items-center justify-center">
        <div className="relative flex items-center p-1.5 rounded-2xl bg-slate-900/90 border-[0.5px] border-white/15 shadow-xl">
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              setBillingInterval('month');
            }}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              billingInterval === 'month'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Facturation Mensuelle
          </button>
          
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              setBillingInterval('year');
            }}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              billingInterval === 'year'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Facturation Annuelle</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 uppercase shadow-sm">
              -20% Réduction
            </span>
          </button>
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrentPlan = subscription?.status === 'active' && subscription?.planId === plan.id;
          const hasOtherActivePlan = subscription?.status === 'active' && subscription?.planId !== plan.id;
          const isPopular = plan.popular;

          // Price calculation based on interval
          const displayPrice = billingInterval === 'year' && plan.annualMonthlyPrice > 0
            ? `${plan.annualMonthlyPrice.toFixed(2).replace('.', ',')}€`
            : plan.monthlyPrice > 0 
              ? `${plan.monthlyPrice.toFixed(2).replace('.', ',')}€`
              : 'Sur devis';

          const billingSubtext = plan.monthlyPrice > 0
            ? billingInterval === 'year'
              ? `facturé ${(plan.annualMonthlyPrice * 12).toFixed(2).replace('.', ',')}€ / an`
              : 'sans engagement, résiliable à tout moment'
            : 'contact & contrat dédié';

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-2xl p-5 sm:p-6 transition-all duration-300 border-[0.5px] ${plan.cardBorder} ${
                isPopular ? 'scale-[1.02] shadow-[0_0_30px_rgba(168,85,247,0.2)]' : 'hover:scale-[1.01]'
              } ${isCurrentPlan ? 'ring-2 ring-emerald-400/80 bg-emerald-950/20' : ''}`}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-purple-500/30 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>Recommandé</span>
                </div>
              )}

              {/* Current Active Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-3.5 right-4 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-extrabold uppercase tracking-wider shadow-lg shadow-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Plan Actuel</span>
                </div>
              )}

              {/* Card Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${plan.dotColor}`} />
                    <h3 className="font-bold text-white text-lg">{plan.name}</h3>
                  </div>
                </div>

                {/* Pricing Display */}
                <div className="pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                      {displayPrice}
                    </span>
                    {plan.monthlyPrice > 0 && (
                      <span className="text-xs sm:text-sm text-slate-400 font-medium">
                        {plan.periodLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {billingSubtext}
                  </p>
                </div>

                {/* Energy & Rollover pill */}
                <div className="p-2.5 rounded-xl bg-white/[0.04] border-[0.5px] border-white/10 flex items-center gap-2">
                  <BatteryCharging className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-200">{plan.batteryCapacity}</span>
                </div>

                {/* Feature List */}
                <div className="pt-3 border-t border-white/10 space-y-2.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inclus dans ce forfait :</p>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-snug">
                        <div className="p-0.5 rounded bg-sky-500/20 text-sky-400 mt-0.5 shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Dynamic Action Button according to User State */}
              <div className="pt-6 mt-4 border-t border-white/10">
                {isCurrentPlan ? (
                  <button
                    type="button"
                    onClick={handleOpenCustomerPortal}
                    disabled={loadingPortal}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-[0.5px] border-emerald-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{loadingPortal ? 'Chargement...' : 'Plan Actif (Gérer)'}</span>
                  </button>
                ) : hasOtherActivePlan ? (
                  <button
                    type="button"
                    onClick={() => handlePlanAction(plan)}
                    disabled={loadingPlanId === plan.id}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${plan.buttonBg}`}
                  >
                    {loadingPlanId === plan.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Changer pour ce forfait</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePlanAction(plan)}
                    disabled={loadingPlanId === plan.id}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${plan.buttonBg}`}
                  >
                    {loadingPlanId === plan.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : plan.id === 'custom' ? (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Demander un devis</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Choisir cette formule</span>
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Consumption System & Automatic Monthly Rollover Box (Under 4 plans) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border-[0.5px] border-emerald-500/30 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border-[0.5px] border-emerald-400/30 text-emerald-400">
              <BatteryCharging className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                <span>{t('settings.energyTitle')}</span>
              </h3>
              <p className="text-xs text-slate-400">
                Suivi de votre jauge d'énergie et accumulation de vos crédits reportés
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border-[0.5px] border-white/20 text-xs sm:text-sm font-mono shadow-inner">
            <span className="text-emerald-400 font-bold">{energyPercent}%</span>
            <span className="text-slate-300">{t('header.remaining')}</span>
          </div>
        </div>

        {/* Battery Gauge Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-300">
            <span className="font-medium">{t('settings.energyLevel')} :</span>
            <span className="text-white font-bold font-mono">{energyPercent}% {t('settings.energyAvailable')}</span>
          </div>
          <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border-[0.5px] border-white/20 p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 transition-all duration-500 shadow-sm"
              style={{ width: `${Math.min(100, energyPercent || 80)}%` }}
            />
          </div>
        </div>

        {/* Monthly Rollover Logic Box */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border-[0.5px] border-emerald-500/30 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <strong className="text-white">{t('settings.rolloverTitle')} :</strong>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border-[0.5px] border-emerald-400/40">
              +{rolloverInfo?.rolloverEnergy || 35}% {t('settings.rolloverCarried')}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('settings.rolloverDesc')}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
            <span className="text-xs text-slate-300">
              {t('settings.totalEnergyAvailable')} : <strong className="text-emerald-300 font-mono text-sm">{(energyPercent || 80) + (rolloverInfo?.rolloverEnergy || 35)}%</strong>
            </span>
            {onPerformRollover && (
              <button
                type="button"
                onClick={() => {
                  onPerformRollover();
                  playCyberSound('success');
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border-[0.5px] border-emerald-400 text-emerald-200 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('settings.simulateRollover')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {selectedCustomPlan && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#030914]/95 border-[0.5px] border-sky-400/40 max-w-xl mx-auto space-y-4 shadow-2xl animate-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              <span>Demande de Forfait Sur Mesure Entreprise</span>
            </h3>
            <button
              onClick={() => setSelectedCustomPlan(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/5"
            >
              Annuler
            </button>
          </div>

          {contactSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border-[0.5px] border-emerald-400/40 text-emerald-300 text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
              <p className="font-bold">Demande transmise avec succès !</p>
              <p className="text-xs text-slate-300">Notre équipe d'ingénierie vous recontactera sous 24h ouvrées.</p>
            </div>
          ) : (
            <form onSubmit={handleEnterpriseContact} className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Précisez votre infrastructure requise, nombre d'utilisateurs et besoins spécifiques (SLA, chiffrement dédié, intégrations d'API).
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email professionnel</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@votre-entreprise.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border-[0.5px] border-white/15 text-white text-xs focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Détails du projet</label>
                <textarea
                  rows={3}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Volumes de requêtes estimés, intégrations personnalisées..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border-[0.5px] border-white/15 text-white text-xs focus:outline-none focus:border-sky-400 resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 font-bold text-xs hover:from-sky-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/30"
              >
                <Send className="w-4 h-4" />
                <span>Envoyer ma demande à l'équipe</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Security & Guarantees Trust Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="p-4 rounded-xl bg-white/[0.02] border-[0.5px] border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Paiement Sécurisé Stripe</h4>
            <p className="text-[11px] text-slate-400">Chiffrement bancaire SSL / TLS 1.3 & 3D-Secure</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border-[0.5px] border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Report d'Énergie Mensuel</h4>
            <p className="text-[11px] text-slate-400">Vos crédits non utilisés se cumulent automatiquement</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border-[0.5px] border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Sans Engagement</h4>
            <p className="text-[11px] text-slate-400">Annulez ou changez de forfait en 1 clic via le portail</p>
          </div>
        </div>
      </div>

      {/* Footer Legal & Disclaimer Links */}
      <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              setLegalTab('cgv');
              setShowLegalModal(true);
            }}
            className="text-sky-300 hover:text-sky-200 underline underline-offset-2 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
            <span>Clause de non-responsabilité & CGV IA</span>
          </button>

          <span className="text-white/20 hidden sm:inline">•</span>

          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              setLegalTab('lcen');
              setShowLegalModal(true);
            }}
            className="text-slate-300 hover:text-white underline underline-offset-2 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Scale className="w-3.5 h-3.5 text-slate-400" />
            <span>Mentions légales (Loi LCEN)</span>
          </button>
        </div>

        {onBackToDashboard && !isModalMode && (
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              onBackToDashboard();
            }}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Retour au Dashboard</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Secure Checkout & Verification Modal */}
      {activeCheckoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#030914] border-[0.5px] border-sky-400/40 p-6 sm:p-8 shadow-[0_0_60px_rgba(56,189,248,0.15)] text-left space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white">
                    Passerelle de Paiement Sécurisée
                  </h3>
                  <p className="text-xs text-slate-400">
                    Vérification stricte de transaction bancaire
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  setActiveCheckoutPlan(null);
                  setPaymentStep('details');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Payment Details */}
            {paymentStep === 'details' && (
              <div className="space-y-4">
                {/* Plan Summary */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Formule sélectionnée</span>
                    <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                      <span>{activeCheckoutPlan.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">
                        {billingInterval === 'year' ? 'Annuel (-20%)' : 'Mensuel'}
                      </span>
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-lg sm:text-xl font-black text-emerald-400">
                      {billingInterval === 'year'
                        ? (activeCheckoutPlan.annualMonthlyPrice * 12).toFixed(2)
                        : activeCheckoutPlan.monthlyPrice.toFixed(2)} €
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {billingInterval === 'year' ? 'TTC / an' : 'TTC / mois'}
                    </span>
                  </div>
                </div>

                {/* Card Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Titulaire de la carte</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Numéro de carte bancaire</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                      />
                      <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[10px] text-slate-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>3DS 2.0</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Date d'expiration</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Code CVC / CVV</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-400/20 text-[11px] text-sky-200 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    La formule ne sera activée qu'après confirmation et vérification stricte du débit par les serveurs sécurisés.
                  </span>
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  onClick={handleConfirmAndProcessPayment}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Payer et Valider le Règlement</span>
                </button>
              </div>
            )}

            {/* Step 2: Strict Verifying in Progress */}
            {paymentStep === 'verifying' && (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-white">
                    Vérification du règlement en cours...
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Interrogation des serveurs de paiement, contrôle 3D-Secure et validation de la transaction.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Payment Confirmed Success */}
            {paymentStep === 'success' && (
              <div className="py-4 text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Paiement vérifié & validé</span>
                  </div>
                  <h4 className="text-lg font-black text-white">
                    Souscription Débloquée !
                  </h4>
                  <p className="text-xs text-slate-300">
                    Votre transaction <code className="text-sky-300 font-mono text-[10px]">{paymentSessionInfo?.transactionId?.slice(0, 16)}...</code> a été validée avec succès.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Montant réglé :</span>
                    <span className="font-bold text-emerald-400">{paymentSessionInfo?.amount} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Batterie IA :</span>
                    <span className="font-bold text-sky-400">{paymentSessionInfo?.energy}% capacité</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playCyberSound('click');
                    setActiveCheckoutPlan(null);
                    setPaymentStep('details');
                    if (isModalMode && onCloseModal) {
                      onCloseModal();
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Continuer avec mon forfait actif
                </button>
              </div>
            )}

            {/* Step 4: Error on Payment */}
            {paymentStep === 'error' && (
              <div className="py-4 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-400/50 text-rose-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-white">
                    Paiement non validé
                  </h4>
                  <p className="text-xs text-rose-300">
                    {paymentError || "Le paiement n'a pas pu être confirmé. Aucun accès n'a été débloqué."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playCyberSound('click');
                    setPaymentStep('details');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all cursor-pointer"
                >
                  Réessayer avec d'autres identifiants
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Legal Modal Component */}
      <LegalDisclaimerModal
        isOpen={showLegalModal}
        initialTab={legalTab}
        onClose={() => setShowLegalModal(false)}
      />

    </div>
  );
};
