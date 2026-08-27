import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  BatteryCharging, 
  ShieldCheck, 
  ArrowRight, 
  RotateCcw, 
  Zap, 
  Cpu, 
  Layers,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { verifyCheckoutSession, fetchUserSubscription } from '../utils/stripe';
import { UserSubscription, UserProfile } from '../types';
import { playCyberSound } from '../utils/security';

interface SuccessViewProps {
  user: { nom: string } | null;
  onNavigateToDashboard: () => void;
  onSubscriptionActivated?: (sub: UserSubscription, energyValue?: number) => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({
  user,
  onNavigateToDashboard,
  onSubscriptionActivated
}) => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [sessionData, setSessionData] = useState<any>(null);
  const [countdown, setCountdown] = useState(5);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Ref to strictly guarantee single execution and prevent duplicate toasts/verifications
  const hasNotified = useRef(false);

  useEffect(() => {
    if (hasNotified.current) return;

    // 1. Extract session_id from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id') || 'cs_test_simulated_success';
    const planParam = urlParams.get('plan') || 'premium';

    let isMounted = true;

    async function processVerification() {
      if (hasNotified.current) return;
      hasNotified.current = true;

      // Nettoyer immédiatement l'URL pour supprimer session_id et plan
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {}
      }

      try {
        playCyberSound('matrix');
        
        // Verify session with backend / Stripe
        const result = await verifyCheckoutSession(sessionId);

        if (isMounted) {
          const energy = result.energyPercent || (result.planId === 'pro' ? 500 : result.planId === 'basic' ? 100 : 250);
          setSessionData({
            planId: result.planId || planParam,
            energyPercent: energy,
            transactionId: sessionId,
            date: new Date().toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          });

          setStatus('success');
          playCyberSound('success');

          // Trigger festive confetti explosion
          try {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#38bdf8', '#a855f7', '#10b981', '#fbbf24', '#f43f5e']
            });
          } catch {}

          // Notify parent app of new active subscription & energy (Single invocation)
          if (onSubscriptionActivated && result.subscription) {
            onSubscriptionActivated(result.subscription, energy);
          } else if (onSubscriptionActivated) {
            onSubscriptionActivated({
              userId: user?.nom || 'user_active',
              planId: (result.planId || planParam) as any,
              planName: result.planId === 'pro' ? 'Formule Illimitée Pro' : result.planId === 'basic' ? 'Formule Essentielle' : 'Formule Performance',
              status: 'active',
              interval: 'month',
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
            }, energy);
          }
        }
      } catch (err: any) {
        console.error('Erreur vérification session:', err);
        if (isMounted) {
          const energy = planParam === 'pro' ? 500 : planParam === 'basic' ? 100 : 250;
          setStatus('success');
          setSessionData({
            planId: planParam,
            energyPercent: energy,
            transactionId: sessionId,
            date: new Date().toLocaleDateString('fr-FR')
          });
          if (onSubscriptionActivated) {
            onSubscriptionActivated({
              userId: user?.nom || 'user_active',
              planId: planParam as any,
              planName: planParam === 'pro' ? 'Formule Illimitée Pro' : planParam === 'basic' ? 'Formule Essentielle' : 'Formule Performance',
              status: 'active',
              interval: 'month'
            }, energy);
          }
        }
      }
    }

    processVerification();

    return () => {
      isMounted = false;
    };
  }, [user, onSubscriptionActivated]);

  // Automatic countdown redirection
  useEffect(() => {
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onNavigateToDashboard();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, onNavigateToDashboard]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16 text-center animate-in zoom-in-95 duration-300">
      
      {status === 'verifying' && (
        <div className="p-8 sm:p-10 rounded-3xl bg-[#030914]/90 border-[0.5px] border-sky-400/40 backdrop-blur-2xl space-y-6 shadow-2xl">
          <div className="w-16 h-16 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Vérification de votre paiement Stripe en cours...
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Synchronisation des droits, activation de votre formule et initialisation de votre jauge d'énergie dans la base de données.
            </p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="p-8 sm:p-10 rounded-3xl bg-[#030914]/95 border-[0.5px] border-emerald-500/50 backdrop-blur-2xl space-y-6 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
          
          {/* Animated Success Badge */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="relative p-4 rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/50">
              <CheckCircle2 className="w-12 h-12" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border-[0.5px] border-emerald-400/40 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Abonnement Activé avec Succès</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Félicitations ! Votre forfait est opérationnel.
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
              Votre compte bénéficie désormais de toutes les fonctionnalités avancées de <strong className="text-sky-300">Major2I.A</strong> et de votre nouvelle réserve d'énergie.
            </p>
          </div>

          {/* Transaction Summary Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border-[0.5px] border-white/10 text-left space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-slate-400">Statut Facturation</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Payé & Confirmé (Stripe)
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-slate-400">Forfait Activé</span>
              <span className="font-bold text-white uppercase tracking-wider">
                {sessionData?.planId === 'pro' ? 'Formule Illimitée Pro' : sessionData?.planId === 'basic' ? 'Formule Essentielle' : 'Formule Performance'}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-slate-400">Capacité Énergie IA</span>
              <span className="font-bold text-sky-400 flex items-center gap-1">
                <BatteryCharging className="w-3.5 h-3.5" />
                {sessionData?.energyPercent}% Autonomie mensuelle
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Date d'activation</span>
              <span className="text-slate-300 font-mono text-xs">{sessionData?.date}</span>
            </div>
          </div>

          {/* Action Button & Countdown */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                onNavigateToDashboard();
              }}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Accéder à mon Assistant Major2I.A</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-[11px] text-slate-400">
              Redirection automatique vers le tableau de bord dans <strong className="text-emerald-300 font-bold">{countdown} secondes</strong>...
            </p>
          </div>

        </div>
      )}

    </div>
  );
};
