import React, { useState, useMemo } from 'react';
import { 
  Brain, 
  Plus, 
  Trash2, 
  FileText, 
  Search, 
  Star, 
  Pencil, 
  MessageSquare, 
  CheckSquare, 
  Bell, 
  ArrowRight,
  Sparkles,
  Layers,
  Calendar,
  Filter,
  Check
} from 'lucide-react';
import { Memoire, Conversation, Priority } from '../types';
import { playCyberSound } from '../utils/security';
import { exportItemToPDF } from '../utils/pdfExport';

interface MemoirePanelProps {
  memoire: Memoire[];
  conversations?: Conversation[];
  onAddMemoire: (contenu: string, tags: string[], importance: number) => Promise<void>;
  onUpdateMemoire?: (mem: Memoire) => Promise<void>;
  onDeleteMemoire: (id: number) => Promise<void>;
  onSelectConversation?: (id: number) => void;
  onAddTache?: (tache: { titre: string; description?: string; priorite: Priority; echeance?: string }) => Promise<void>;
  onAddRappel?: (rappel: { titre: string; description?: string; dateRappel: string; heure: string; priorite: Priority }) => Promise<void>;
  onGoToChat?: () => void;
}

export const MemoirePanel: React.FC<MemoirePanelProps> = ({
  memoire,
  conversations = [],
  onAddMemoire,
  onUpdateMemoire,
  onDeleteMemoire,
  onSelectConversation,
  onAddTache,
  onAddRappel,
  onGoToChat,
}) => {
  const [activeTab, setActiveTab] = useState<'memoire' | 'demandes'>('memoire');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemoire, setEditingMemoire] = useState<Memoire | null>(null);
  const [actionDoneToast, setActionDoneToast] = useState<string | null>(null);

  // Form states
  const [newContent, setNewContent] = useState('');
  const [newTagsStr, setNewTagsStr] = useState('');
  const [newImportance, setNewImportance] = useState(3);

  const showQuickToast = (msg: string) => {
    setActionDoneToast(msg);
    setTimeout(() => setActionDoneToast(null), 3000);
  };

  // Extract all unique tags
  const allTags = useMemo(() => {
    return Array.from(
      new Set(memoire.flatMap((m) => m.tags || []))
    ).filter(Boolean);
  }, [memoire]);

  // Filtered memory items
  const filteredMemoire = useMemo(() => {
    return memoire
      .filter((m) => {
        const matchesSearch =
          m.contenu.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.tags || []).some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!matchesSearch) return false;
        if (selectedTag) return (m.tags || []).includes(selectedTag);
        return true;
      })
      .sort((a, b) => b.importance - a.importance);
  }, [memoire, searchTerm, selectedTag]);

  // Aggregate all user questions and requests across all conversations
  const allUserRequests = useMemo(() => {
    const requests: Array<{
      convId: number;
      convTitle: string;
      messageIndex: number;
      text: string;
      date: string;
      image?: string;
    }> = [];

    conversations.forEach((conv) => {
      conv.messages.forEach((msg, idx) => {
        if (msg.role === 'user' && msg.contenu && msg.contenu.trim()) {
          requests.push({
            convId: conv.id,
            convTitle: conv.titre || 'Session sans titre',
            messageIndex: idx,
            text: msg.contenu.trim(),
            date: msg.date || conv.date,
            image: msg.image,
          });
        }
      });
    });

    // Sort latest requests first
    return requests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [conversations]);

  // Filtered user requests
  const filteredRequests = useMemo(() => {
    if (!searchTerm.trim()) return allUserRequests;
    const term = searchTerm.toLowerCase();
    return allUserRequests.filter(
      (r) => r.text.toLowerCase().includes(term) || r.convTitle.toLowerCase().includes(term)
    );
  }, [allUserRequests, searchTerm]);

  const handleOpenAdd = () => {
    playCyberSound('beep');
    setEditingMemoire(null);
    setNewContent('');
    setNewTagsStr('');
    setNewImportance(3);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Memoire) => {
    playCyberSound('click');
    setEditingMemoire(item);
    setNewContent(item.contenu);
    setNewTagsStr((item.tags || []).join(', '));
    setNewImportance(item.importance || 3);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    const tags = newTagsStr
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    if (editingMemoire && onUpdateMemoire) {
      await onUpdateMemoire({
        ...editingMemoire,
        contenu: newContent.trim(),
        tags: tags.length > 0 ? tags : ['général'],
        importance: newImportance,
      });
      playCyberSound('success');
    } else {
      await onAddMemoire(newContent.trim(), tags.length > 0 ? tags : ['manuel'], newImportance);
    }

    setEditingMemoire(null);
    setNewContent('');
    setNewTagsStr('');
    setNewImportance(3);
    setIsModalOpen(false);
  };

  const handleQuickMemorize = async (text: string) => {
    playCyberSound('beep');
    await onAddMemoire(text, ['requête-ia', 'sauvegarde'], 4);
    showQuickToast('🧠 Demande mémorisée dans vos notes !');
  };

  const handleQuickCreateTask = async (text: string) => {
    if (!onAddTache) return;
    playCyberSound('click');
    await onAddTache({
      titre: text.slice(0, 80),
      description: text,
      priorite: 'normale',
    });
    showQuickToast('✅ Tâche créée avec succès dans le menu !');
  };

  const handleQuickCreateReminder = async (text: string) => {
    if (!onAddRappel) return;
    playCyberSound('alert');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await onAddRappel({
      titre: text.slice(0, 80),
      description: text,
      dateRappel: tomorrow.toISOString().split('T')[0],
      heure: '09:00',
      priorite: 'normale',
    });
    showQuickToast('🔔 Rappel programmé pour demain à 09:00 !');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#030914]/50 p-4 md:p-6 overflow-y-auto">
      {/* Quick Action Toast */}
      {actionDoneToast && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl shadow-2xl border border-white animate-bounce">
          <Check className="w-4 h-4" />
          <span>{actionDoneToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white">
        <div>
          <div className="flex items-center gap-2.5">
            <Brain className="w-6 h-6 text-purple-300" />
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Mémoire & Historique des Requêtes
            </h1>
          </div>
          <p className="text-sm text-slate-300 mt-1 font-medium">
            Retrouvez toutes vos demandes faites au chatbot ainsi que les informations mémorisées et consignées.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-md transition-all border border-white shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Mémoriser une information</span>
        </button>
      </div>

      {/* Navigation Tabs (Mémoire vs Journal des Demandes) */}
      <div className="flex items-center gap-2 my-4 border-b border-white/20 pb-3">
        <button
          onClick={() => {
            playCyberSound('click');
            setActiveTab('memoire');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
            activeTab === 'memoire'
              ? 'bg-purple-600 text-white border-white shadow-lg ring-2 ring-purple-400/40'
              : 'bg-slate-900/80 text-slate-300 border-white/30 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Brain className="w-4 h-4 text-purple-300" />
          <span>Mémoire & Faits Mémorisés ({memoire.length})</span>
        </button>

        <button
          onClick={() => {
            playCyberSound('click');
            setActiveTab('demandes');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
            activeTab === 'demandes'
              ? 'bg-sky-600 text-white border-white shadow-lg ring-2 ring-sky-400/40'
              : 'bg-slate-900/80 text-slate-300 border-white/30 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-sky-300" />
          <span>Journal de toutes vos Requêtes ({allUserRequests.length})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={
              activeTab === 'memoire'
                ? 'Rechercher dans la mémoire...'
                : 'Rechercher dans toutes vos demandes...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-white rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-white font-sans"
          />
        </div>

        {/* Tag Filters (Only in Memoire tab) */}
        {activeTab === 'memoire' && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedTag(null)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border border-white ${
                selectedTag === null
                  ? 'bg-white/25 text-white font-bold ring-2 ring-white'
                  : 'bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              Tous les tags ({memoire.length})
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border border-white ${
                  selectedTag === tag
                    ? 'bg-purple-600/50 text-purple-100 font-bold ring-2 ring-white'
                    : 'bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: MÉMOIRE & NOTES ENREGISTRÉES */}
      {activeTab === 'memoire' && (
        <>
          {filteredMemoire.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-white rounded-2xl bg-slate-900/80 my-auto">
              <Brain className="w-12 h-12 text-slate-400 mb-2 stroke-1" />
              <h3 className="text-base font-bold text-white">Mémoire vide</h3>
              <p className="text-sm text-slate-300 max-w-sm mt-1">
                Aucune information enregistrée. Dites simplement au chatbot « Note que... » ou « Mémorise... » pour ajouter instantanément une note ici.
              </p>
              <button
                onClick={handleOpenAdd}
                className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold text-xs border border-white hover:bg-purple-500"
              >
                + Ajouter une note manuellement
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMemoire.map((item) => {
                const isAuto = item.tags?.includes('ia-auto') || item.tags?.includes('menu');
                return (
                  <div
                    key={item.id}
                    className="bg-slate-900/90 rounded-2xl border border-white p-4 flex flex-col justify-between group shadow-md hover:bg-slate-850 transition-all space-y-3"
                  >
                    <div>
                      {/* Card Top: Importance Stars & Actions */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5" title={`Importance : ${item.importance}/5`}>
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < item.importance
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-700 stroke-1'
                                }`}
                              />
                            ))}
                          </div>
                          {isAuto && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-400/40 font-semibold">
                              🤖 Auto IA
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Modifier ✏️ */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Modifier ✏️"
                            className="p-1 border border-white rounded-lg bg-purple-950/60 text-purple-300 hover:bg-purple-900 hover:text-white transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              playCyberSound('click');
                              exportItemToPDF('memoire', item);
                            }}
                            title="Exporter en PDF"
                            className="p-1 border border-white rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                          >
                            <FileText className="w-3.5 h-3.5 text-sky-400" />
                          </button>
                          <button
                            onClick={() => {
                              playCyberSound('alert');
                              onDeleteMemoire(item.id);
                            }}
                            title="Oublier / Supprimer"
                            className="p-1 border border-white rounded-lg bg-rose-950/60 text-rose-300 hover:bg-rose-900"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                        {item.contenu}
                      </p>
                    </div>

                    <div>
                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {item.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-white/10 text-white border border-white"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Date footer */}
                      <div className="pt-2 border-t border-white/30 text-xs text-slate-300 flex items-center justify-between">
                        <span>
                          {new Date(item.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="text-[11px] font-semibold text-purple-300 hover:text-purple-200 hover:underline flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          Modifier
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: JOURNAL DE TOUTES LES DEMANDES CHATBOT */}
      {activeTab === 'demandes' && (
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-white rounded-2xl bg-slate-900/80 my-auto">
              <MessageSquare className="w-12 h-12 text-slate-400 mb-2 stroke-1" />
              <h3 className="text-base font-bold text-white">Aucune demande trouvée</h3>
              <p className="text-sm text-slate-300 max-w-sm mt-1">
                Posez vos questions ou formulez vos requêtes dans le chat pour qu'elles soient répertoriées ici automatiquement.
              </p>
              {onGoToChat && (
                <button
                  onClick={onGoToChat}
                  className="mt-4 px-4 py-2 rounded-xl bg-sky-600 text-white font-semibold text-xs border border-white hover:bg-sky-500"
                >
                  💬 Aller au Chatbot
                </button>
              )}
            </div>
          ) : (
            filteredRequests.map((req, i) => (
              <div
                key={`${req.convId}-${req.messageIndex}-${i}`}
                className="p-4 rounded-2xl bg-slate-900/90 border border-white hover:bg-slate-850 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30 font-semibold flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {req.convTitle}
                    </span>
                    <span className="text-slate-400">
                      {new Date(req.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-white font-medium whitespace-pre-wrap">
                    « {req.text} »
                  </p>

                  {req.image && (
                    <div className="mt-1">
                      <img
                        src={req.image}
                        alt="Image jointe"
                        className="w-16 h-16 object-cover rounded-lg border border-white/20"
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons for this request */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {/* Memorize into Memory */}
                  <button
                    onClick={() => handleQuickMemorize(req.text)}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-400/40 text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Enregistrer cette demande dans la Mémoire"
                  >
                    <Brain className="w-3.5 h-3.5 text-purple-300" />
                    <span>Mémoriser</span>
                  </button>

                  {/* Create Task */}
                  {onAddTache && (
                    <button
                      onClick={() => handleQuickCreateTask(req.text)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-400/40 text-xs font-semibold flex items-center gap-1 transition-all"
                      title="Créer une Tâche à partir de cette demande"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Tâche</span>
                    </button>
                  )}

                  {/* Create Reminder */}
                  {onAddRappel && (
                    <button
                      onClick={() => handleQuickCreateReminder(req.text)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-400/40 text-xs font-semibold flex items-center gap-1 transition-all"
                      title="Créer un Rappel à partir de cette demande"
                    >
                      <Bell className="w-3.5 h-3.5 text-rose-300" />
                      <span>Rappel</span>
                    </button>
                  )}

                  {/* Jump to Chat */}
                  {onSelectConversation && (
                    <button
                      onClick={() => {
                        playCyberSound('click');
                        onSelectConversation(req.convId);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white border border-white text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
                      title="Ouvrir cette conversation"
                    >
                      <span>Voir</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add / Edit Memory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border-2 border-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {editingMemoire ? (
                <>
                  <Pencil className="w-5 h-5 text-purple-400" />
                  Modifier la Mémoire ✏️
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5 text-purple-400" />
                  Mémoriser une information
                </>
              )}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Information à retenir *</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Ex: Mon code postal, mes préférences alimentaires, note importante..."
                  className="w-full bg-slate-900 border border-white rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (séparés par des virgules)</label>
                <input
                  type="text"
                  value={newTagsStr}
                  onChange={(e) => setNewTagsStr(e.target.value)}
                  placeholder="perso, travail, rdv, contact"
                  className="w-full bg-slate-900 border border-white rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Niveau d'importance (1 à 5)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setNewImportance(lvl)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border border-white transition-all ${
                        newImportance === lvl
                          ? 'bg-purple-600 text-white shadow-md ring-2 ring-white'
                          : 'bg-slate-900 text-slate-300 hover:text-white'
                      }`}
                    >
                      {lvl} ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white text-white hover:bg-slate-800 font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 border border-white text-white font-semibold text-sm shadow-md"
                >
                  {editingMemoire ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
