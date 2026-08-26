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
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#f0f2f5] p-4 md:p-6 overflow-y-auto">
      {/* Quick Action Toast */}
      {actionDoneToast && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#42b72a] text-white font-bold text-sm rounded-full shadow-2xl animate-bounce">
          <Check className="w-4 h-4" />
          <span>{actionDoneToast}</span>
        </div>
      )}

      {/* Header in Facebook Card Style */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e4e6eb] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#1877f2] text-white flex items-center justify-center shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#050505]">
              Mémoire & Historique des Requêtes
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#65676b] mt-1 font-medium">
            Retrouvez toutes vos demandes faites à l'assistant ainsi que les faits et informations mémorisés.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold text-sm shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Mémoriser une info</span>
        </button>
      </div>

      {/* Navigation Tabs (Mémoire vs Journal des Demandes) in Facebook Pill Tabs */}
      <div className="flex items-center gap-2 my-4">
        <button
          onClick={() => {
            playCyberSound('click');
            setActiveTab('memoire');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'memoire'
              ? 'bg-[#1877f2] text-white shadow-xs'
              : 'bg-white border border-[#ced0d4] text-[#65676b] hover:bg-[#e4e6eb] hover:text-[#050505]'
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>Faits Mémorisés ({memoire.length})</span>
        </button>

        <button
          onClick={() => {
            playCyberSound('click');
            setActiveTab('demandes');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'demandes'
              ? 'bg-[#1877f2] text-white shadow-xs'
              : 'bg-white border border-[#ced0d4] text-[#65676b] hover:bg-[#e4e6eb] hover:text-[#050505]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Journal des Requêtes ({allUserRequests.length})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#65676b] pointer-events-none" />
          <input
            type="text"
            placeholder={
              activeTab === 'memoire'
                ? 'Rechercher dans la mémoire...'
                : 'Rechercher dans vos demandes...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-[#ced0d4] rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-[#050505] placeholder-[#65676b] focus:outline-none focus:border-[#1877f2]"
          />
        </div>

        {/* Tag Filters (Only in Memoire tab) */}
        {activeTab === 'memoire' && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedTag(null)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                selectedTag === null
                  ? 'bg-[#1877f2] text-white font-bold shadow-xs'
                  : 'bg-white border border-[#ced0d4] text-[#65676b] hover:bg-[#e4e6eb] hover:text-[#050505]'
              }`}
            >
              Tous ({memoire.length})
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                  selectedTag === tag
                    ? 'bg-[#1877f2] text-white font-bold shadow-xs'
                    : 'bg-white border border-[#ced0d4] text-[#65676b] hover:bg-[#e4e6eb] hover:text-[#050505]'
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
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-[#e4e6eb] rounded-2xl bg-white shadow-sm my-auto">
              <div className="w-16 h-16 rounded-full bg-[#f0f2f5] flex items-center justify-center text-[#65676b] mb-3">
                <Brain className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#050505]">Mémoire vide</h3>
              <p className="text-xs sm:text-sm text-[#65676b] max-w-sm mt-1">
                Aucune information enregistrée. Dites simplement au chatbot « Note que... » ou « Mémorise... » pour ajouter instantanément une note ici.
              </p>
              <button
                onClick={handleOpenAdd}
                className="mt-4 px-4 py-2 rounded-full bg-[#1877f2] text-white font-bold text-xs hover:bg-[#166fe5] shadow-xs cursor-pointer"
              >
                + Ajouter manuellement
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMemoire.map((item) => {
                const isAuto = item.tags?.includes('ia-auto') || item.tags?.includes('menu');
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-[#e4e6eb] p-4 sm:p-5 flex flex-col justify-between group shadow-sm hover:shadow-md transition-all space-y-3"
                  >
                    <div>
                      {/* Card Top: Importance Stars & Actions */}
                      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#f0f2f5]">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5" title={`Importance : ${item.importance}/5`}>
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < item.importance
                                    ? 'text-[#f7b125] fill-[#f7b125]'
                                    : 'text-[#ced0d4] stroke-1'
                                }`}
                              />
                            ))}
                          </div>
                          {isAuto && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e7f3ff] text-[#1877f2] font-bold">
                              🤖 Auto IA
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Modifier */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Modifier"
                            className="p-1.5 rounded-full hover:bg-[#f0f2f5] text-[#65676b] hover:text-[#050505] transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              playCyberSound('click');
                              exportItemToPDF('memoire', item);
                            }}
                            title="Exporter en PDF"
                            className="p-1.5 rounded-full hover:bg-[#f0f2f5] text-[#65676b] hover:text-[#1877f2] transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              playCyberSound('alert');
                              onDeleteMemoire(item.id);
                            }}
                            title="Oublier / Supprimer"
                            className="p-1.5 rounded-full hover:bg-rose-50 text-[#65676b] hover:text-[#fa383e] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-xs sm:text-sm text-[#050505] leading-relaxed whitespace-pre-wrap font-medium">
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
                              className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#f0f2f5] text-[#65676b]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Date footer */}
                      <div className="pt-2 border-t border-[#f0f2f5] text-xs text-[#65676b] flex items-center justify-between">
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
                          className="text-xs font-bold text-[#1877f2] hover:underline flex items-center gap-1"
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
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-[#e4e6eb] rounded-2xl bg-white shadow-sm my-auto">
              <div className="w-16 h-16 rounded-full bg-[#f0f2f5] flex items-center justify-center text-[#65676b] mb-3">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-[#050505]">Aucune demande trouvée</h3>
              <p className="text-xs sm:text-sm text-[#65676b] max-w-sm mt-1">
                Posez vos questions ou formulez vos requêtes dans le chat pour qu'elles soient répertoriées ici automatiquement.
              </p>
              {onGoToChat && (
                <button
                  onClick={onGoToChat}
                  className="mt-4 px-4 py-2 rounded-full bg-[#1877f2] text-white font-bold text-xs hover:bg-[#166fe5] shadow-xs cursor-pointer"
                >
                  💬 Aller au Chatbot
                </button>
              )}
            </div>
          ) : (
            filteredRequests.map((req, i) => (
              <div
                key={`${req.convId}-${req.messageIndex}-${i}`}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e4e6eb] hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#e7f3ff] text-[#1877f2] font-bold flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {req.convTitle}
                    </span>
                    <span className="text-[#65676b]">
                      {new Date(req.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-[#050505] font-medium whitespace-pre-wrap">
                    « {req.text} »
                  </p>

                  {req.image && (
                    <div className="mt-1">
                      <img
                        src={req.image}
                        alt="Image jointe"
                        className="w-16 h-16 object-cover rounded-lg border border-[#ced0d4]"
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons for this request in Facebook Style */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {/* Memorize into Memory */}
                  <button
                    onClick={() => handleQuickMemorize(req.text)}
                    className="px-3 py-1.5 rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#050505] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    title="Enregistrer cette demande dans la Mémoire"
                  >
                    <Brain className="w-3.5 h-3.5 text-[#1877f2]" />
                    <span>Mémoriser</span>
                  </button>

                  {/* Create Task */}
                  {onAddTache && (
                    <button
                      onClick={() => handleQuickCreateTask(req.text)}
                      className="px-3 py-1.5 rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#050505] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Créer une Tâche à partir de cette demande"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-[#42b72a]" />
                      <span>Tâche</span>
                    </button>
                  )}

                  {/* Create Reminder */}
                  {onAddRappel && (
                    <button
                      onClick={() => handleQuickCreateReminder(req.text)}
                      className="px-3 py-1.5 rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#050505] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Créer un Rappel à partir de cette demande"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#f7b125]" />
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
                      className="px-3 py-1.5 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#ced0d4] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-[#050505] flex items-center gap-2">
              {editingMemoire ? (
                <>
                  <Pencil className="w-5 h-5 text-[#1877f2]" />
                  Modifier la Mémoire
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5 text-[#1877f2]" />
                  Mémoriser une information
                </>
              )}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#65676b] mb-1">Information à retenir *</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Ex: Mon code postal, mes préférences alimentaires, note importante..."
                  className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl p-3 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#65676b] mb-1">Tags (séparés par des virgules)</label>
                <input
                  type="text"
                  value={newTagsStr}
                  onChange={(e) => setNewTagsStr(e.target.value)}
                  placeholder="perso, travail, rdv, contact"
                  className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3.5 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#65676b] mb-1">Niveau d'importance (1 à 5)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setNewImportance(lvl)}
                      className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        newImportance === lvl
                          ? 'bg-[#1877f2] text-white shadow-xs'
                          : 'bg-[#f0f2f5] border border-[#ced0d4] text-[#65676b] hover:bg-[#e4e6eb]'
                      }`}
                    >
                      {lvl} ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e4e6eb]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#e4e6eb] hover:bg-[#d8dadf] text-[#050505] font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold text-xs sm:text-sm shadow-sm cursor-pointer"
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
