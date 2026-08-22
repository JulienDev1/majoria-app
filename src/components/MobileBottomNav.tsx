import React from 'react';
import { MessageSquare, Menu, X, Flame } from 'lucide-react';
import { PanelId } from '../types';
import { playCyberSound } from '../utils/security';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

interface MobileBottomNavProps {
  activePanel: PanelId;
  setActivePanel: (panel: PanelId) => void;
  onOpenMobileMenu: () => void;
  onOpenForfaits?: () => void;
  onImportFile?: () => void;
  isMobileSidebarOpen?: boolean;
  tasksCount?: number;
  remindersCount?: number;
  favorisCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePanel,
  setActivePanel,
  onOpenMobileMenu,
  onOpenForfaits,
  isMobileSidebarOpen = false,
}) => {
  const { t } = useLanguage();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#030914]/80 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 shadow-lg pb-[calc(0.35rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex items-center justify-around gap-1.5 max-w-lg mx-auto">
        {/* Bouton Chat */}
        <button
          onClick={() => {
            playCyberSound('click');
            setActivePanel('chat');
          }}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all border-[0.5px] backdrop-blur-xl ${
            activePanel === 'chat'
              ? 'border-white/40 bg-white/20 text-white shadow-md font-bold'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4.5 h-4.5" />
          <span className="text-[11px] font-semibold mt-0.5">{t('nav.chat')}</span>
        </button>

        {/* Commutateur Rapide FR | EN (remplace le bouton Importer) */}
        <LanguageSelector variant="bottom-nav" />

        {/* Bouton Forfaits */}
        <button
          type="button"
          onClick={() => {
            playCyberSound('click');
            if (onOpenForfaits) onOpenForfaits();
          }}
          title={t('header.plansTitle')}
          className="relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl border-[0.5px] border-red-400/50 bg-gradient-to-r from-red-600/80 via-rose-600/80 to-red-600/80 text-white shadow-md active:scale-95 transition-all cursor-pointer shrink-0 backdrop-blur-xl"
        >
          <Flame className="w-4.5 h-4.5 text-white" />
          <span className="text-[11px] font-bold text-white mt-0.5">
            {t('header.plansBtn')}
          </span>
        </button>

        {/* Bouton Menu */}
        <button
          type="button"
          onClick={() => {
            playCyberSound('click');
            onOpenMobileMenu();
          }}
          title={isMobileSidebarOpen ? t('common.close') : 'Menu'}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl border-[0.5px] transition-all active:scale-95 shadow-sm backdrop-blur-xl ${
            isMobileSidebarOpen ? 'border-rose-400/50 bg-rose-500/20 text-rose-300' : 'border-white/15 bg-white/[0.05] text-white hover:bg-white/10'
          }`}
        >
          {isMobileSidebarOpen ? <X className="w-4.5 h-4.5 text-rose-400" /> : <Menu className="w-4.5 h-4.5 text-white" />}
          <span className="text-[11px] font-semibold mt-0.5">{isMobileSidebarOpen ? t('common.close') : 'Menu'}</span>
        </button>
      </div>
    </nav>
  );
};
