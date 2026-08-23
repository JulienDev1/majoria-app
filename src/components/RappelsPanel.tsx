import React, { useState } from 'react';
import { Bell, Plus, CheckCircle, Trash2, FileText, Clock, Search, Calendar, Volume2, Pencil } from 'lucide-react';
import { Rappel, Priority } from '../types';
import { playCyberSound, playReminderAlarmSound } from '../utils/security';
import { exportItemToPDF } from '../utils/pdfExport';

interface RappelsPanelProps {
  rappels: Rappel[];
  onAddRappel: (rappel: Omit<Rappel, 'id' | 'dateCreation' | 'statut'>) => Promise<void>;
  onUpdateRappel?: (rappel: Rappel) => Promise<void>;
  onToggleStatus: (id: number, currentStatut: string) => Promise<void>;
  onDeleteRappel: (id: number) => Promise<void>;
}

export const RappelsPanel: React.FC<RappelsPanelProps> = ({
  rappels,
  onAddRappel,
  onUpdateRappel,
  onToggleStatus,
  onDeleteRappel,
}) => {
  const [filterStatut, setFilterStatut] = useState<'tous' | 'actif' | 'termine'>('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRappel, setEditingRappel] = useState<Rappel | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [newPriority, setNewPriority] = useState<Priority>('normale');

  const filtered = rappels.filter((r) => {
    const matchSearch =
      r.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (filterStatut === 'tous') return true;
    return r.statut === filterStatut;
  });

  const handleOpenAdd = () => {
    playCyberSound('beep');
    setEditingRappel(null);
    setNewTitle('');
    setNewDesc('');
    setNewDate('');
    setNewTime('');
    setNewEndDate('');
    setNewEndTime('');
    setHasEndDate(false);
    setNewPriority('normale');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: Rappel) => {
    playCyberSound('click');
    setEditingRappel(r);
    setNewTitle(r.titre);
    setNewDesc(r.description || '');
    setNewDate(r.dateRappel || '');
    setNewTime(r.heure || '');
    setNewEndDate(r.dateFinRappel || '');
    setNewEndTime(r.heureFin || '');
    setHasEndDate(Boolean(r.dateFinRappel || r.heureFin));
    setNewPriority(r.priorite || 'normale');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (editingRappel && onUpdateRappel) {
      await onUpdateRappel({
        ...editingRappel,
        titre: newTitle.trim(),
        description: newDesc.trim() || undefined,
        dateRappel: newDate || undefined,
        heure: newTime || undefined,
        dateFinRappel: hasEndDate && newEndDate ? newEndDate : undefined,
        heureFin: hasEndDate && newEndTime ? newEndTime : undefined,
        priorite: newPriority,
      });
      playCyberSound('success');
    } else {
      await onAddRappel({
        titre: newTitle.trim(),
        description: newDesc.trim() || undefined,
        dateRappel: newDate || undefined,
        heure: newTime || undefined,
        dateFinRappel: hasEndDate && newEndDate ? newEndDate : undefined,
        heureFin: hasEndDate && newEndTime ? newEndTime : undefined,
        priorite: newPriority,
      });
    }

    setEditingRappel(null);
    setNewTitle('');
    setNewDesc('');
    setNewDate('');
    setNewTime('');
    setNewEndDate('');
    setNewEndTime('');
    setHasEndDate(false);
    setNewPriority('normale');
    setIsModalOpen(false);
  };

  const getPriorityBadge = (p: Priority) => {
    switch (p) {
      case 'critique':
        return 'bg-rose-500/40 text-rose-100 border-white font-bold';
      case 'haute':
        return 'bg-amber-500/40 text-amber-100 border-white font-bold';
      case 'basse':
        return 'bg-sky-500/30 text-sky-100 border-white';
      case 'normale':
      default:
        return 'bg-slate-700/60 text-slate-100 border-white';
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#030914]/50 p-4 md:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white">
        <div>
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-rose-400" />
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Rappels & Échéances
            </h1>
          </div>
          <p className="text-sm text-slate-300 mt-1 font-medium">
            Programmez, modifiez ✏️ vos notifications et alertes sonores au moment fixé (avec date de début et de fin).
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-md transition-all border border-white"
        >
          <Plus className="w-4 h-4" />
          <span>Programmer un rappel</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un rappel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-white rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-white font-sans"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
          {(['tous', 'actif', 'termine'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                playCyberSound('click');
                setFilterStatut(st);
              }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl capitalize transition-all border border-white ${
                filterStatut === st
                  ? 'bg-white/25 text-white font-bold ring-2 ring-white'
                  : 'bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              {st === 'tous' ? 'Tous les rappels' : st === 'actif' ? 'Actifs' : 'Terminés'}
            </button>
          ))}
        </div>
      </div>

      {/* Rappels Grid */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-white rounded-2xl bg-slate-900/80">
          <Bell className="w-12 h-12 text-slate-400 mb-2 stroke-1" />
          <h3 className="text-base font-bold text-white">Aucun rappel trouvé</h3>
          <p className="text-sm text-slate-300 max-w-sm mt-1">
            Programmez un rappel avec alerte son et notification pour ne rien manquer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rappel) => {
            const isCompleted = rappel.statut === 'termine';

            return (
              <div
                key={rappel.id}
                className={`bg-slate-900/90 rounded-2xl border border-white p-4 flex flex-col justify-between group shadow-md hover:bg-slate-850 transition-all space-y-3 ${
                  isCompleted ? 'opacity-70' : ''
                }`}
              >
                <div>
                  {/* Top line with Priority, Test Sound & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-white ${getPriorityBadge(rappel.priorite)}`}>
                      {rappel.priorite}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Modifier ✏️ */}
                      <button
                        onClick={() => handleOpenEdit(rappel)}
                        title="Modifier ✏️"
                        className="p-1 border border-white rounded-lg bg-rose-950/60 text-rose-300 hover:bg-rose-900 hover:text-white transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          playReminderAlarmSound();
                        }}
                        title="Tester le son d'alerte"
                        className="p-1 border border-white rounded-lg bg-slate-800 text-rose-300 hover:text-white hover:bg-rose-900/50 transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          playCyberSound('click');
                          exportItemToPDF('rappel', rappel);
                        }}
                        title="Exporter en PDF"
                        className="p-1 border border-white rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      >
                        <FileText className="w-3.5 h-3.5 text-sky-400" />
                      </button>
                      <button
                        onClick={() => {
                          playCyberSound('alert');
                          onDeleteRappel(rappel.id);
                        }}
                        title="Supprimer"
                        className="p-1 border border-white rounded-lg bg-rose-950/60 text-rose-300 hover:bg-rose-900"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Checkbox */}
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => {
                        playCyberSound('success');
                        onToggleStatus(rappel.id, rappel.statut);
                      }}
                      className={`mt-0.5 w-5 h-5 rounded-lg border-2 border-white flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-transparent'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <h3 className={`text-base font-bold truncate ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                        {rappel.titre}
                      </h3>
                      {rappel.description && (
                        <p className="text-sm text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                          {rappel.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dates & Times (Start + End) */}
                <div className="pt-2 border-t border-white/30 space-y-1.5 text-xs text-slate-300">
                  {/* Start Date & Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>
                        <span className="text-slate-400 font-medium">Début : </span>
                        {rappel.dateRappel
                          ? new Date(rappel.dateRappel).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'Non fixé'}
                        {rappel.heure ? ` à ${rappel.heure}` : ''}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(rappel)}
                      className="text-[11px] font-semibold text-rose-300 hover:text-rose-200 hover:underline flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      Modifier
                    </button>
                  </div>

                  {/* End Date & Time if defined */}
                  {rappel.dateFinRappel && (
                    <div className="flex items-center gap-1.5 text-slate-300 pt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        <span className="text-slate-400 font-medium">Fin : </span>
                        {new Date(rappel.dateFinRappel).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                        {rappel.heureFin ? ` à ${rappel.heureFin}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border-2 border-white rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {editingRappel ? (
                <>
                  <Pencil className="w-5 h-5 text-rose-400" />
                  Modifier le Rappel ✏️
                </>
              ) : (
                <>
                  <Bell className="w-5 h-5 text-rose-400" />
                  Nouveau Rappel & Alerte
                </>
              )}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Titre du rappel *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Rendez-vous médical, réunion projet..."
                  className="w-full bg-slate-900 border border-white rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description (optionnelle)</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Détails supplémentaires..."
                  className="w-full bg-slate-900 border border-white rounded-xl p-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              {/* Date & Heure de Début / Moment fixé */}
              <div className="bg-slate-900/80 border border-white/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                  <Clock className="w-4 h-4 text-rose-400" />
                  <span>Date & Heure de début (Moment fixé pour le son et notification)</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Date</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-slate-950 border border-white rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Heure</label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full bg-slate-950 border border-white rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Case à cocher Date de fin de rappel */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={hasEndDate}
                    onChange={(e) => setHasEndDate(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-white text-rose-500 focus:ring-rose-400 cursor-pointer accent-rose-500"
                  />
                  <span>Définir une date de fin de rappel</span>
                </label>

                {hasEndDate && (
                  <div className="bg-slate-900/80 border border-amber-400/40 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <span>Date & Heure de fin du rappel</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Date de fin</label>
                        <input
                          type="date"
                          value={newEndDate}
                          min={newDate || undefined}
                          onChange={(e) => setNewEndDate(e.target.value)}
                          className="w-full bg-slate-950 border border-white rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Heure de fin</label>
                        <input
                          type="time"
                          value={newEndTime}
                          onChange={(e) => setNewEndTime(e.target.value)}
                          className="w-full bg-slate-950 border border-white rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Priorité</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Priority)}
                  className="w-full bg-slate-900 border border-white rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                >
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="critique">Critique</option>
                </select>
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
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 border border-white text-white font-semibold text-sm shadow-md"
                >
                  {editingRappel ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
