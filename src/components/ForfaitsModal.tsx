import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { playCyberSound } from '../utils/security';
import { RolloverEnergyInfo, UserProfile, UserSubscription } from '../types';
import { PricingView } from './PricingView';
import { useLanguage } from '../context/LanguageContext';

interface ForfaitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { nom: string } | null;
  userProfile?: UserProfile;
  currentSubscription?: UserSubscription | null;
  onSubscriptionUpdate?: (sub: UserSubscription) => void;
  onOpenAuth: () => void;
  energyPercent?: number | null;
  rolloverInfo?: RolloverEnergyInfo;
  onRecharge?: (amount: number) => void;
}

export const ForfaitsModal: React.FC<ForfaitsModalProps> = ({
  isOpen,
  onClose,
  user,
  userProfile,
  currentSubscription,
  onSubscriptionUpdate,
  onOpenAuth,
  energyPercent = 80,
  rolloverInfo,
}) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="max-w-6xl w-full border-[0.5px] border-white/20 rounded-3xl bg-[#030914]/95 backdrop-blur-2xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border-[0.5px] border-sky-400/30 text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-base sm:text-lg">
                {t('pricing.modalTitle')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('pricing.modalDesc')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playCyberSound('click');
              onClose();
            }}
            aria-label={t('common.close')}
            className="p-2 rounded-xl border-[0.5px] border-white/15 bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing View Embedded in Modal */}
        <PricingView
          user={user}
          userProfile={userProfile}
          currentSubscription={currentSubscription}
          onSubscriptionUpdate={onSubscriptionUpdate}
          onOpenAuth={onOpenAuth}
          energyPercent={energyPercent}
          rolloverInfo={rolloverInfo}
          isModalMode={true}
          onCloseModal={onClose}
        />

      </div>
    </div>
  );
};
