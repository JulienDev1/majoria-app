import React from 'react';
import { 
  MessageSquare, 
  Star, 
  Brain, 
  Bell, 
  CheckSquare, 
  Calendar, 
  BarChart3, 
  Plus, 
  Trash2, 
  Edit3, 
  Hash, 
  Search, 
  X,
  Mic,
  ShieldCheck,
  Battery,
  BatteryCharging,
  Flame,
  Layers,
  ChevronLeft,
  PanelLeftClose
} from 'lucide-react';
import { PanelId, Conversation } from '../types';
import { playCyberSound } from '../utils/security';
import { useLanguage } from '../context/LanguageContext';

interface NavigationSidebarProps {
  activePanel: PanelId;
  setActivePanel: (panel: PanelId) => void;
  conversations: Conversation[];
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: number) => void;
  onDeleteConversation: (id: number) => void;
  onToggleFavoriConv: (id: number) => void;
  onAddTagToConv: (id: number) => void;
  conversationSearch: string;
  setConversationSearch: (q: string) => void;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  favorisCount: number;
  memoireCount: number;
  rappelsCount: number;
  tachesCount: number;
  energyPercent?: number | null;
  rolloverPercent?: number;
  onOpenForfaits?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  activePanel,
  setActivePanel,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onToggleFavoriConv,
  onAddTagToConv,
  conversationSearch,
  setConversationSearch,
  activeCategory,
  setActiveCategory,
  favorisCount,
  memoireCount,
  rappelsCount,
  tachesCount,
  energyPercent = 100,
  rolloverPercent = 0,
  onOpenForfaits,
  isOpenMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { t } = useLanguage();

  const navItems = [
    { 
      id: 'chat' as PanelId, 
      label: t('nav.chat'), 
      icon: MessageSquare, 
      badge: conversations.length,
      iconBg: 'bg-[#1877F2] text-white',
    },
    { 
      id: 'transcription' as PanelId, 
      label: t('nav.transcription'), 
      icon: Mic,
      iconBg: 'bg-[#FA383E] text-white',
    },
    { 
      id: 'favoris' as PanelId, 
      label: t('nav.favoris'), 
      icon: Star, 
      badge: favorisCount,
      iconBg: 'bg-[#F7B125] text-white',
    },
    { 
      id: 'memoire' as PanelId, 
      label: t('nav.memoire'), 
      icon: Brain, 
      badge: memoireCount,
      iconBg: 'bg-[#9360F7] text-white',
    },
    { 
      id: 'rappels' as PanelId, 
      label: t('nav.rappels'), 
      icon: Bell, 
      badge: rappelsCount, 
      alert: rappelsCount > 0,
      iconBg: 'bg-[#00A3FF] text-white',
    },
    { 
      id: 'taches' as PanelId, 
      label: t('nav.taches'), 
      icon: CheckSquare, 
      badge: tachesCount,
      iconBg: 'bg-[#2EB85C] text-white',
    },
    { 
      id: 'calendar' as PanelId, 
      label: t('nav.calendar'), 
      icon: Calendar,
      iconBg: 'bg-[#4B4DED] text-white',
    },
    { 
      id: 'stats' as PanelId, 
      label: t('nav.stats'), 
      icon: BarChart3,
      iconBg: 'bg-[#D62976] text-white',
    },
  ];

  const categories = [
    { id: 'tous', label: t('common.all') },
    { id: 'favoris', label: `⭐ ${t('favoris.title')}` },
    { id: 'général', label: t('nav.general') },
    { id: 'travail', label: t('nav.work') },
    { id: 'perso', label: t('nav.personal') },
    { id: 'urgent', label: 'Urgent' },
  ];

  const filteredConversations = conversations.filter((c) => {
    const matchSearch =
      c.titre.toLowerCase().includes(conversationSearch.toLowerCase()) ||
      c.tags?.some((t) => t.toLowerCase().includes(conversationSearch.toLowerCase()));
    
    if (!matchSearch) return false;
    if (activeCategory === 'tous') return true;
    if (activeCategory === 'favoris') return c.favori;
    return c.categorie === activeCategory;
  });

  const effectiveEnergy = typeof energyPercent === 'number' ? energyPercent : 100;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed lg:relative top-0 bottom-0 left-0 z-40 bg-[var(--fb-bg)] lg:bg-transparent border-r border-[var(--fb-border)]/60 lg:border-r-0 flex flex-col transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          isOpenMobile 
            ? 'translate-x-0 w-72 sm:w-80 shadow-2xl bg-[var(--fb-surface)]' 
            : isCollapsed 
              ? '-translate-x-full lg:translate-x-0 lg:w-0 lg:border-r-0 lg:opacity-0 pointer-events-none'
              : '-translate-x-full lg:translate-x-0 w-72 md:w-80 opacity-100'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--fb-text-primary)] text-sm tracking-tight">Navigation & Raccourcis</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Collapse Button */}
            {onToggleCollapse && (
              <button
                onClick={() => {
                  playCyberSound('click');
                  onToggleCollapse();
                }}
                title="Masquer le menu"
                className="hidden lg:flex items-center gap-1 p-1.5 rounded-full hover:bg-[var(--fb-hover)] text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)] text-xs transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-full hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Primary Navigation Menu */}
        <div className="px-2 py-1 space-y-0.5 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  playCyberSound('click');
                  setActivePanel(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--fb-blue-light)] text-[var(--fb-blue)] font-bold shadow-xs'
                    : 'text-[var(--fb-text-primary)] hover:bg-[var(--fb-hover)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${item.iconBg}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-[var(--fb-blue)] text-white' : 'bg-[var(--fb-surface-secondary)] text-[var(--fb-text-primary)]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="my-2 mx-3 border-t border-[var(--fb-border-light)]" />

        {/* Conversation List section if in Chat Panel */}
        {activePanel === 'chat' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-2">
            {/* Header & New Chat Button */}
            <div className="px-1 pb-2 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--fb-text-secondary)] uppercase tracking-wider">
                  {t('nav.history')} ({conversations.length})
                </span>
                <button
                  onClick={() => {
                    playCyberSound('beep');
                    onNewConversation();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  title={t('nav.newChat')}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('common.add')}</span>
                </button>
              </div>

              {/* Search input in conversations */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[var(--fb-text-muted)]" />
                <input
                  type="text"
                  placeholder={t('nav.searchConv')}
                  value={conversationSearch}
                  onChange={(e) => setConversationSearch(e.target.value)}
                  className="w-full bg-[var(--fb-surface)] border border-[var(--fb-border)] focus:border-[var(--fb-blue)] rounded-full pl-8 pr-7 py-1.5 text-xs text-[var(--fb-text-primary)] placeholder-[var(--fb-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--fb-blue)]"
                />
                {conversationSearch && (
                  <button
                    onClick={() => setConversationSearch('')}
                    className="absolute right-2.5 top-2 text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      playCyberSound('click');
                      setActiveCategory(cat.id);
                    }}
                    className={`px-2.5 py-1 rounded-full border whitespace-nowrap cursor-pointer transition-all ${
                      activeCategory === cat.id
                        ? 'bg-[var(--fb-blue)] border-[var(--fb-blue)] text-white font-bold'
                        : 'bg-[var(--fb-surface)] border-[var(--fb-border)] text-[var(--fb-text-secondary)] hover:bg-[var(--fb-hover)] hover:text-[var(--fb-text-primary)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto space-y-1 pb-3 pr-1">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-6 text-xs text-[var(--fb-text-secondary)]">
                  {t('nav.emptyConvs')}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        playCyberSound('click');
                        onSelectConversation(conv.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[var(--fb-blue-light)] border-[var(--fb-blue)]/40 text-[var(--fb-blue)] font-semibold'
                          : 'bg-[var(--fb-surface)] hover:bg-[var(--fb-hover)] border-[var(--fb-border-light)] text-[var(--fb-text-primary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-[var(--fb-blue)]' : 'bg-[var(--fb-border)]'}`} />
                          {conv.favori && (
                            <Star className="w-3.5 h-3.5 text-[#f7b125] fill-[#f7b125] shrink-0" />
                          )}
                          <span className="text-xs truncate font-medium">{conv.titre}</span>
                        </div>

                        {/* Quick actions hover buttons */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playCyberSound('beep');
                              onToggleFavoriConv(conv.id);
                            }}
                            title={conv.favori ? t('favoris.remove') : t('favoris.addFav')}
                            className="p-1 rounded-full hover:bg-[var(--fb-surface-secondary)] text-[#f7b125]"
                          >
                            <Star className={`w-3.5 h-3.5 ${conv.favori ? 'fill-[#f7b125]' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playCyberSound('click');
                              onRenameConversation(conv.id);
                            }}
                            title={t('nav.rename')}
                            className="p-1 rounded-full hover:bg-[var(--fb-surface-secondary)] text-[var(--fb-text-secondary)]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playCyberSound('alert');
                              onDeleteConversation(conv.id);
                            }}
                            title={t('common.delete')}
                            className="p-1 rounded-full hover:bg-rose-500/20 text-[var(--fb-red)]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tags */}
                      {conv.tags && conv.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 pl-4">
                          {conv.tags.map((tagItem, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--fb-surface-secondary)] text-[var(--fb-text-secondary)] font-medium"
                            >
                              #{tagItem}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Battery / Energy Card */}
        <div className="p-3 border-t border-[var(--fb-border-light)] shrink-0">
          <div className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[var(--fb-surface)] border border-[var(--fb-border-light)] shadow-sm">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full ${
                effectiveEnergy <= 0 
                  ? 'bg-rose-100 dark:bg-rose-950/40 text-[var(--fb-red)]' 
                  : effectiveEnergy <= 25
                  ? 'bg-amber-100 dark:bg-amber-950/40 text-[var(--fb-gold)]'
                  : 'bg-green-100 dark:bg-green-950/40 text-[var(--fb-green)]'
              }`}>
                <BatteryCharging className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-[var(--fb-text-secondary)] tracking-wider">Batterie IA</div>
                <div className="text-xs font-bold text-[var(--fb-text-primary)] flex items-center gap-1">
                  <span>{effectiveEnergy}%</span>
                  <span className="text-[10px] font-normal text-[var(--fb-text-secondary)]">{t('header.remaining')}</span>
                </div>
              </div>
            </div>

            {onOpenForfaits && (
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  onOpenForfaits();
                }}
                className="px-2.5 py-1.5 rounded-full bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                title={t('header.plansTitle')}
              >
                <Flame className="w-3.5 h-3.5 text-white" />
                <span>{t('header.plansBtn')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Status footer */}
        <div className="p-2.5 border-t border-[var(--fb-border-light)] text-xs flex items-center justify-between shrink-0 text-[var(--fb-text-secondary)]">
          <span className="flex items-center gap-1.5 text-[var(--fb-green)] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--fb-green)]" />
            Sécurisé
          </span>
          <span className="font-semibold text-[var(--fb-text-primary)]">MajorI.A 2026</span>
        </div>
      </aside>
    </>
  );
};
