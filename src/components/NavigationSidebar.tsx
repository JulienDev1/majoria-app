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
  Smartphone,
  Flame,
  Layers
} from 'lucide-react';
import { PanelId, Conversation } from '../types';
import { playCyberSound } from '../utils/security';
import { CyberBrainHead } from './CyberBrainHead';
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
  onOpenMobileBridge?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
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
  onOpenMobileBridge,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { t } = useLanguage();

  const navItems = [
    { 
      id: 'chat' as PanelId, 
      label: t('nav.chat'), 
      icon: MessageSquare, 
      badge: conversations.length,
      activeBg: 'bg-white/15 border-white/40 text-white shadow-md font-bold',
      iconColor: 'text-sky-300',
      badgeBg: 'bg-sky-500/20 text-white border-white/20'
    },
    { 
      id: 'transcription' as PanelId, 
      label: t('nav.transcription'), 
      icon: Mic,
      activeBg: 'bg-white/15 border-white/40 text-white shadow-md font-bold',
      iconColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/20 text-white border-white/20'
    },
    { 
      id: 'favoris' as PanelId, 
      label: t('nav.favoris'), 
      icon: Star, 
      badge: favorisCount,
      activeBg: 'bg-white/15 border-white/40 text-white shadow-md font-bold',
      iconColor: 'text-amber-300',
      badgeBg: 'bg-amber-500/20 text-white border-white/20'
    },
    { 
      id: 'memoire' as PanelId, 
      label: t('nav.memoire'), 
      icon: Brain, 
      badge: memoireCount,
      activeBg: 'bg-white/15 border-white/40 text-white shadow-md font-bold',
      iconColor: 'text-purple-300',
      badgeBg: 'bg-purple-500/20 text-white border-white/20'
    },
    { 
      id: 'rappels' as PanelId, 
      label: t('nav.rappels'), 
      icon: Bell, 
      badge: rappelsCount, 
      alert: rappelsCount > 0,
      activeBg: 'bg-white/15 border-white/40 text-white shadow-md font-bold',
      iconColor: 'text-rose-300',
      badgeBg: 'bg-rose-500/20 text-white border-white/20'
    },
    { 
      id: 'taches' as PanelId, 
      label: t('nav.taches'), 
      icon: CheckSquare, 
      badge: tachesCount,
      activeBg: 'bg-white/15 border-white/40 text-white shadow-md font-bold',
      iconColor: 'text-emerald-300',
      badgeBg: 'bg-emerald-500/20 text-white border-white/20'
    },
    { 
      id: 'calendar' as PanelId, 
      label: t('nav.calendar'), 
      icon: Calendar,
      activeBg: 'bg-white/15 border-white/40 text-white shadow-md font-bold',
      iconColor: 'text-sky-300',
      badgeBg: 'bg-sky-500/20 text-white border-white/20'
    },
    { 
      id: 'stats' as PanelId, 
      label: t('nav.stats'), 
      icon: BarChart3,
      activeBg: 'bg-white/15 border-white/40 text-white shadow-md font-bold',
      iconColor: 'text-fuchsia-300',
      badgeBg: 'bg-fuchsia-500/20 text-white border-white/20'
    },
  ];

  const categories = [
    { id: 'tous', label: t('common.all'), color: 'bg-white/10 text-white border-white/20' },
    { id: 'favoris', label: `⭐ ${t('favoris.title')}`, color: 'bg-amber-500/20 text-amber-200 border-amber-400/30' },
    { id: 'général', label: t('nav.general'), color: 'bg-purple-500/20 text-purple-200 border-purple-400/30' },
    { id: 'travail', label: t('nav.work'), color: 'bg-sky-500/20 text-sky-200 border-sky-400/30' },
    { id: 'perso', label: t('nav.personal'), color: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' },
    { id: 'urgent', label: 'Urgent', color: 'bg-rose-500/20 text-rose-200 border-rose-400/30' },
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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 md:w-80 bg-[#030914]/50 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header in Sidebar */}
        <div className="p-3 border-b border-white/10 flex items-center justify-between lg:hidden shrink-0">
          <div className="flex items-center gap-2">
            <CyberBrainHead size={24} />
            <span className="font-bold text-white text-base">Menu MajorI.A</span>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg border-[0.5px] border-white/20 text-white bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Navigation Menu */}
        <div className="p-3 space-y-1 shrink-0 border-b border-white/10">
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border-[0.5px] cursor-pointer backdrop-blur-xl ${
                  isActive
                    ? item.activeBg
                    : 'border-transparent text-slate-300 hover:text-white hover:bg-white/[0.06] hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${item.iconColor}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border-[0.5px] font-mono font-bold ${item.badgeBg}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Mobile Bridge Shortcut */}
          {onOpenMobileBridge && (
            <button
              onClick={() => {
                playCyberSound('click');
                onOpenMobileBridge();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border-[0.5px] border-white/10 text-sky-300 hover:text-white hover:bg-sky-500/10 cursor-pointer backdrop-blur-xl mt-1"
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-sky-400" />
                <span>Pont Mobile</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border-[0.5px] border-emerald-400/40 text-emerald-300 font-bold">
                Actif
              </span>
            </button>
          )}
        </div>

        {/* Conversation List section if in Chat Panel */}
        {activePanel === 'chat' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Header & New Chat Button */}
            <div className="p-3 pb-2 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('nav.history')} ({conversations.length})
                </span>
                <button
                  onClick={() => {
                    playCyberSound('beep');
                    onNewConversation();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600/70 hover:bg-sky-500/90 text-white text-xs font-semibold border-[0.5px] border-white/20 transition-all cursor-pointer backdrop-blur-xl"
                  title={t('nav.newChat')}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('common.add')}</span>
                </button>
              </div>

              {/* Search input in conversations */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('nav.searchConv')}
                  value={conversationSearch}
                  onChange={(e) => setConversationSearch(e.target.value)}
                  className="w-full bg-white/[0.04] backdrop-blur-xl border-[0.5px] border-white/15 focus:border-white/40 rounded-xl pl-8 pr-7 py-1 text-xs text-white placeholder-slate-400 focus:outline-none"
                />
                {conversationSearch && (
                  <button
                    onClick={() => setConversationSearch('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      playCyberSound('click');
                      setActiveCategory(cat.id);
                    }}
                    className={`px-2 py-0.5 rounded-full border-[0.5px] whitespace-nowrap cursor-pointer transition-all ${
                      activeCategory === cat.id
                        ? 'bg-white/20 border-white/50 text-white font-bold'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-3">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
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
                      className={`group relative p-2.5 rounded-xl border-[0.5px] transition-all cursor-pointer backdrop-blur-xl ${
                        isActive
                          ? 'bg-white/15 border-white/40 text-white font-semibold shadow-sm'
                          : 'bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/[0.07] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {conv.favori && (
                            <Star className="w-3 h-3 text-amber-300 fill-amber-300 shrink-0" />
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
                            className="p-1 rounded hover:bg-white/10 text-amber-300"
                          >
                            <Star className={`w-3 h-3 ${conv.favori ? 'fill-amber-300' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playCyberSound('click');
                              onRenameConversation(conv.id);
                            }}
                            title={t('nav.rename')}
                            className="p-1 rounded hover:bg-white/10 text-slate-300"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playCyberSound('alert');
                              onDeleteConversation(conv.id);
                            }}
                            title={t('common.delete')}
                            className="p-1 rounded hover:bg-rose-900 text-rose-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Tags */}
                      {conv.tags && conv.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {conv.tags.map((tagItem, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-1.5 py-0.5 rounded-md border-[0.5px] border-white/20 bg-white/10 text-white"
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

        {/* Battery / Energy Consumption Card in Sidebar */}
        <div className="p-3 border-t border-white/10 bg-[#030914]/60 shrink-0">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.04] border-[0.5px] border-white/15 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg border-[0.5px] ${
                effectiveEnergy <= 0 
                  ? 'bg-rose-500/20 border-rose-400 text-rose-400' 
                  : effectiveEnergy <= 25
                  ? 'bg-amber-500/20 border-amber-400 text-amber-400'
                  : 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
              }`}>
                <BatteryCharging className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Batterie IA</div>
                <div className="text-xs font-extrabold font-mono text-white flex items-center gap-1">
                  <span>{effectiveEnergy}%</span>
                  <span className="text-[10px] font-normal text-slate-400 font-sans">{t('header.remaining')}</span>
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
                className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600/80 to-rose-600/80 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold border-[0.5px] border-white/20 shadow-md active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                title={t('header.plansTitle')}
              >
                <Flame className="w-3 h-3 text-amber-300" />
                <span>{t('header.plansBtn')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Security & Mobile status footer */}
        <div className="p-2.5 border-t border-white/10 bg-slate-950/40 text-xs flex items-center justify-between shrink-0 text-slate-300">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Sécurisé
          </span>
          <span className="text-white font-semibold">MajorI.A 2026</span>
        </div>
      </aside>
    </>
  );
};
