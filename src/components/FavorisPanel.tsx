import React, { useState } from 'react';
import { Star, Plus, Trash2, FileText, Search, Copy, Check, Pencil } from 'lucide-react';
import { Favori } from '../types';
import { playCyberSound } from '../utils/security';
import { exportItemToPDF } from '../utils/pdfExport';

interface FavorisPanelProps {
  favoris: Favori[];
  onAddFavori: (titre: string, contenu: string, categorie: string) => Promise<void>;
  onUpdateFavori?: (favori: Favori) => Promise<void>;
  onDeleteFavori: (id: number) => Promise<void>;
}

export const FavorisPanel: React.FC<FavorisPanelProps> = ({
  favoris,
  onAddFavori,
  onUpdateFavori,
  onDeleteFavori,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCat, setActiveCat] = useState('tous');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFavori, setEditingFavori] = useState<Favori | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('général');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const categories = [
    { id: 'tous', label: 'Tous', color: 'bg-white/15 text-white border-white' },
    { id: 'général', label: 'Général', color: 'bg-purple-500/30 text-purple-200 border-white' },
    { id: 'travail', label: 'Travail', color: 'bg-emerald-500/30 text-emerald-200 border-white' },
    { id: 'perso', label: 'Personnel', color: 'bg-pink-500/30 text-pink-200 border-white' },
    { id: 'notes', label: 'Notes', color: 'bg-sky-500/30 text-sky-200 border-white' },
    { id: 'important', label: 'Important', color: 'bg-rose-500/30 text-rose-200 border-white' },
  ];

  const filtered = favoris.filter((f) => {
    const matchSearch =
      f.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.contenu || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (activeCat === 'tous') return true;
    return f.categorie === activeCat;
  });

  const handleOpenAdd = () => {
    playCyberSound('beep');
    setEditingFavori(null);
    setNewTitle('');
    setNewContent('');
    setNewCategory('général');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (fav: Favori) => {
    playCyberSound('click');
    setEditingFavori(fav);
    setNewTitle(fav.titre);
    setNewContent(fav.contenu || '');
    setNewCategory(fav.categorie || 'général');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (editingFavori && onUpdateFavori) {
      await onUpdateFavori({
        ...editingFavori,
        titre: newTitle.trim(),
        contenu: newContent.trim(),
        categorie: newCategory,
      });
      playCyberSound('success');
    } else {
      await onAddFavori(newTitle.trim(), newContent.trim(), newCategory);
    }

    setEditingFavori(null);
    setNewTitle('');
    setNewContent('');
    setNewCategory('général');
    setIsModalOpen(false);
  };

  const handleCopy = (content: string, id: number) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    playCyberSound('click');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030914]/50 p-4 md:p-6 overflow-y-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white">
        <div>
          <div className="flex items-center gap-2.5">
            <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Mes Favoris & Notes Clés
            </h1>
          </div>
          <p className="text-sm text-slate-300 mt-1 font-medium">
            Retrouvez rapidement, modifiez ✏️ et organisez vos favoris et notes enregistrées.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm shadow-md transition-all border border-white"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Favori</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher dans les favoris..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-white rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-white font-sans"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                playCyberSound('click');
                setActiveCat(cat.id);
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all border border-white ${
                activeCat === cat.id
                  ? `${cat.color} font-bold ring-2 ring-white`
                  : 'bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-white rounded-2xl bg-slate-900/80">
          <Star className="w-12 h-12 text-slate-400 mb-2 stroke-1" />
          <h3 className="text-base font-bold text-white">Aucun favori enregistré</h3>
          <p className="text-sm text-slate-300 max-w-sm mt-1">
            Ajoutez vos notes ou favoris pour les retrouver et les modifier facilement.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((fav) => (
            <div
              key={fav.id}
              className="bg-slate-900/90 rounded-2xl border border-white p-4 flex flex-col justify-between group shadow-md hover:bg-slate-850 transition-all space-y-3"
            >
              <div>
                {/* Card Top */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded-md border border-white bg-white/10 text-white">
                    {fav.categorie}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Modifier ✏️ */}
                    <button
                      onClick={() => handleOpenEdit(fav)}
                      title="Modifier ✏️"
                      className="p-1 border border-white rounded-lg bg-amber-950/60 text-amber-300 hover:bg-amber-900 hover:text-white transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCopy(fav.contenu || fav.titre, fav.id)}
                      title="Copier le texte"
                      className="p-1 border border-white rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    >
                      {copiedId === fav.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        playCyberSound('click');
                        exportItemToPDF('favori', fav);
                      }}
                      title="Exporter en PDF"
                      className="p-1 border border-white rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                    </button>
                    <button
                      onClick={() => {
                        playCyberSound('alert');
                        onDeleteFavori(fav.id);
                      }}
                      title="Supprimer"
                      className="p-1 border border-white rounded-lg bg-rose-950/60 text-rose-300 hover:bg-rose-900"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-white mb-1.5 truncate">
                  {fav.titre}
                </h3>

                {/* Content preview */}
                <p className="text-sm text-slate-200 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                  {fav.contenu}
                </p>
              </div>

              {/* Date footer */}
              <div className="pt-2 border-t border-white/30 text-xs text-slate-300 flex items-center justify-between">
                <span>
                  {new Date(fav.date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                <button
                  onClick={() => handleOpenEdit(fav)}
                  className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 hover:underline flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Modifier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border-2 border-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {editingFavori ? (
                <>
                  <Pencil className="w-5 h-5 text-amber-400" />
                  Modifier le Favori ✏️
                </>
              ) : (
                <>
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  Nouveau Favori
                </>
              )}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Titre *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Idées projet ou mémo"
                  className="w-full bg-slate-900 border border-white rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Catégorie</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-white rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                >
                  <option value="général">Général</option>
                  <option value="travail">Travail</option>
                  <option value="perso">Personnel</option>
                  <option value="notes">Notes</option>
                  <option value="important">Important</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contenu / Description</label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Détails du favori..."
                  className="w-full bg-slate-900 border border-white rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
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
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 border border-white text-white font-semibold text-sm shadow-md"
                >
                  {editingFavori ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
