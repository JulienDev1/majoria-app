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
  isCollapsed?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePanel,
  setActivePanel,
  onOpenMobileMenu,
  onOpenForfaits,
  isMobileSidebarOpen = false,
  isCollapsed = false,
}) => {
  const { t } = useLanguage();

  return (
    <nav 
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--fb-surface)] text-[var(--fb-text-primary)] border-t border-[var(--fb-border)]/80 px-2 py-1 shadow-md pb-[calc(0.35rem+env(safe-area-inset-bottom,0px))] transition-all duration-300 ease-in-out ${
        isCollapsed 
          ? 'translate-y-full opacity-0 pointer-events-none' 
          : 'translate-y-0 opacity-100'
      }`}
    >
      <div className="flex items-center justify-around gap-1 max-w-lg mx-auto">
        {/* Bouton Chat */}
        <button
          onClick={() => {
            playCyberSound('click');
            setActivePanel('chat');
          }}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-lg transition-all ${
            activePanel === 'chat'
              ? 'text-[var(--fb-blue)] font-bold border-b-2 border-[var(--fb-blue)]'
              : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[11px] font-semibold mt-0.5">{t('nav.chat')}</span>
        </button>

        {/* Commutateur Rapide FR | EN */}
        <LanguageSelector variant="bottom-nav" />

        {/* Bouton Forfaits */}
        <button
          type="button"
          onClick={() => {
            playCyberSound('click');
            if (onOpenForfaits) onOpenForfaits();
          }}
          title={t('header.plansTitle')}
          className="relative flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-[var(--fb-blue)] hover:bg-[var(--fb-hover)] active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Flame className="w-5 h-5 text-[var(--fb-blue)]" />
          <span className="text-[11px] font-bold mt-0.5">
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
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg transition-all active:scale-95 ${
            isMobileSidebarOpen ? 'text-[var(--fb-red)]' : 'text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)]'
          }`}
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span className="text-[11px] font-semibold mt-0.5">{isMobileSidebarOpen ? t('common.close') : 'Menu'}</span>
        </button>
      </div>
    </nav>
  );
};
