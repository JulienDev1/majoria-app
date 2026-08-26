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
    { id: 'tous', label: 'Tous' },
    { id: 'général', label: 'Général' },
    { id: 'travail', label: 'Travail' },
    { id: 'perso', label: 'Personnel' },
    { id: 'notes', label: 'Notes' },
    { id: 'important', label: 'Important' },
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
    <div className="flex-1 flex flex-col h-full bg-[var(--fb-bg)] p-4 md:p-6 overflow-y-auto">
      {/* Header Bar */}
      <div className="bg-[var(--fb-card)] rounded-2xl p-4 sm:p-5 border border-[var(--fb-border)] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[var(--fb-gold)] text-white flex items-center justify-center shadow-xs">
              <Star className="w-5 h-5 fill-white" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[var(--fb-text-primary)]">
              Mes Favoris & Enregistrements
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--fb-text-secondary)] mt-1 font-medium">
            Retrouvez rapidement vos éléments enregistrés, modifiez vos notes et exportez-les.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un favori</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--fb-text-secondary)] pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher dans les enregistrements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--fb-card)] border border-[var(--fb-border)] rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-[var(--fb-text-primary)] placeholder-[var(--fb-text-secondary)] focus:outline-none focus:border-[var(--fb-blue)] focus:ring-1 focus:ring-[var(--fb-blue)]"
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
              className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                activeCat === cat.id
                  ? 'bg-[var(--fb-blue)] text-white font-bold shadow-xs'
                  : 'bg-[var(--fb-card)] border border-[var(--fb-border)] text-[var(--fb-text-secondary)] hover:bg-[var(--fb-surface-secondary)] hover:text-[var(--fb-text-primary)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-[var(--fb-border)] rounded-2xl bg-[var(--fb-card)] shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[var(--fb-surface-secondary)] flex items-center justify-center text-[var(--fb-text-secondary)] mb-3">
            <Star className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[var(--fb-text-primary)]">Aucun favori enregistré</h3>
          <p className="text-xs sm:text-sm text-[var(--fb-text-secondary)] max-w-sm mt-1">
            Ajoutez vos notes ou favoris pour les retrouver et les organiser facilement sur votre fil.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((fav) => (
            <div
              key={fav.id}
              className="bg-[var(--fb-card)] rounded-2xl border border-[var(--fb-border)] p-4 sm:p-5 flex flex-col justify-between group shadow-sm hover:shadow-md transition-all space-y-3"
            >
              <div>
                {/* Card Top */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[var(--fb-border-light)]">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--fb-blue-light)] text-[var(--fb-blue)]">
                    {fav.categorie}
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Modifier */}
                    <button
                      onClick={() => handleOpenEdit(fav)}
                      title="Modifier"
                      className="p-1.5 rounded-full hover:bg-[var(--fb-surface-secondary)] text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)] transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCopy(fav.contenu || fav.titre, fav.id)}
                      title="Copier le texte"
                      className="p-1.5 rounded-full hover:bg-[var(--fb-surface-secondary)] text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)] transition-colors"
                    >
                      {copiedId === fav.id ? <Check className="w-4 h-4 text-[var(--fb-green)]" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        playCyberSound('click');
                        exportItemToPDF('favori', fav);
                      }}
                      title="Exporter en PDF"
                      className="p-1.5 rounded-full hover:bg-[var(--fb-surface-secondary)] text-[var(--fb-text-secondary)] hover:text-[var(--fb-blue)] transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        playCyberSound('alert');
                        onDeleteFavori(fav.id);
                      }}
                      title="Supprimer"
                      className="p-1.5 rounded-full hover:bg-rose-500/20 text-[var(--fb-text-secondary)] hover:text-[var(--fb-red)] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-[var(--fb-text-primary)] mb-1.5 truncate">
                  {fav.titre}
                </h3>

                {/* Content preview */}
                <p className="text-xs sm:text-sm text-[var(--fb-text-secondary)] line-clamp-4 leading-relaxed whitespace-pre-wrap">
                  {fav.contenu}
                </p>
              </div>

              {/* Date footer */}
              <div className="pt-2 border-t border-[var(--fb-border-light)] text-xs text-[var(--fb-text-secondary)] flex items-center justify-between">
                <span>
                  {new Date(fav.date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                <button
                  onClick={() => handleOpenEdit(fav)}
                  className="text-xs font-bold text-[var(--fb-blue)] hover:underline flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Modifier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal in Facebook Dialog Style */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--fb-card)] border border-[var(--fb-border)] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--fb-text-primary)] flex items-center gap-2">
              {editingFavori ? (
                <>
                  <Pencil className="w-5 h-5 text-[var(--fb-blue)]" />
                  Modifier l'élément enregistré
                </>
              ) : (
                <>
                  <Star className="w-5 h-5 text-[var(--fb-gold)] fill-[var(--fb-gold)]" />
                  Nouvel enregistrement
                </>
              )}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[var(--fb-text-secondary)] mb-1">Titre *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Idées projet ou mémo"
                  className="w-full bg-[var(--fb-surface-secondary)] border border-[var(--fb-border)] rounded-xl px-3.5 py-2 text-sm text-[var(--fb-text-primary)] focus:bg-[var(--fb-surface)] focus:outline-none focus:border-[var(--fb-blue)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--fb-text-secondary)] mb-1">Catégorie</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[var(--fb-surface-secondary)] border border-[var(--fb-border)] rounded-xl px-3.5 py-2 text-sm text-[var(--fb-text-primary)] focus:bg-[var(--fb-surface)] focus:outline-none focus:border-[var(--fb-blue)]"
                >
                  <option value="général">Général</option>
                  <option value="travail">Travail</option>
                  <option value="perso">Personnel</option>
                  <option value="notes">Notes</option>
                  <option value="important">Important</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--fb-text-secondary)] mb-1">Contenu / Description</label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Détails du favori..."
                  className="w-full bg-[var(--fb-surface-secondary)] border border-[var(--fb-border)] rounded-xl p-3 text-sm text-[var(--fb-text-primary)] focus:bg-[var(--fb-surface)] focus:outline-none focus:border-[var(--fb-blue)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--fb-border-light)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-[var(--fb-surface-secondary)] hover:bg-[var(--fb-hover)] text-[var(--fb-text-primary)] font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] text-white font-bold text-xs sm:text-sm shadow-sm cursor-pointer"
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
