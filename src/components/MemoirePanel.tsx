import React, { useState } from 'react';
import { Brain, Plus, Trash2, FileText, Search, Star } from 'lucide-react';
import { Memoire } from '../types';
import { playCyberSound } from '../utils/security';
import { exportItemToPDF } from '../utils/pdfExport';

interface MemoirePanelProps {
  memoire: Memoire[];
  onAddMemoire: (contenu: string, tags: string[], importance: number) => Promise<void>;
  onDeleteMemoire: (id: number) => Promise<void>;
}

export const MemoirePanel: React.FC<MemoirePanelProps> = ({
  memoire,
  onAddMemoire,
  onDeleteMemoire,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [newContent, setNewContent] = useState('');
  const [newTagsStr, setNewTagsStr] = useState('');
  const [newImportance, setNewImportance] = useState(3);

  // Extract all unique tags
  const allTags = Array.from(
    new Set(memoire.flatMap((m) => m.tags || []))
  ).filter(Boolean);

  const filtered = memoire
    .filter((m) => {
      const matchesSearch =
        m.contenu.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.tags || []).some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;
      if (selectedTag) return (m.tags || []).includes(selectedTag);
      return true;
    })
    .sort((a, b) => b.importance - a.importance);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    const tags = newTagsStr
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    await onAddMemoire(newContent.trim(), tags, newImportance);
    setNewContent('');
    setNewTagsStr('');
    setNewImportance(3);
    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#030914]/50 p-4 md:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white">
        <div>
          <div className="flex items-center gap-2.5">
            <Brain className="w-5 h-5 text-purple-300" />
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Mémoire & Notes Enregistrées
            </h1>
          </div>
          <p className="text-sm text-slate-300 mt-1 font-medium">
            Informations importantes et instructions retenues par votre assistant MajorI.A.
          </p>
        </div>

        <button
          onClick={() => {
            playCyberSound('beep');
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-md transition-all border border-white"
        >
          <Plus className="w-4 h-4" />
          <span>Mémoriser une information</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher dans la mémoire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-white rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-white font-sans"
          />
        </div>

        {/* Tag Filters */}
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
      </div>

      {/* Memory Cards Grid */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-white rounded-2xl bg-slate-900/80">
          <Brain className="w-12 h-12 text-slate-400 mb-2 stroke-1" />
          <h3 className="text-base font-bold text-white">Mémoire vide</h3>
          <p className="text-sm text-slate-300 max-w-sm mt-1">
            Aucun souvenir ou instruction enregistrée correspondant à votre filtre.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/90 rounded-2xl border border-white p-4 flex flex-col justify-between group shadow-md hover:bg-slate-850 transition-all space-y-3"
            >
              <div>
                {/* Card Top: Importance Stars & Actions */}
                <div className="flex items-center justify-between gap-2 mb-2">
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

                  <div className="flex items-center gap-1.5">
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
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
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
                <div className="pt-2 border-t border-white/30 text-xs text-slate-300">
                  {new Date(item.date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Memory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border-2 border-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              Mémoriser une information
            </h2>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Information à retenir</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Ex: Mon mot de passe wifi de secours, mes préférences de travail..."
                  className="w-full bg-slate-900 border border-white rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (séparés par des virgules)</label>
                <input
                  type="text"
                  value={newTagsStr}
                  onChange={(e) => setNewTagsStr(e.target.value)}
                  placeholder="perso, travail, projet, contact"
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
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
