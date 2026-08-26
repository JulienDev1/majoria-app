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
        return 'bg-[#fa383e]/15 text-[#fa383e] font-bold';
      case 'haute':
        return 'bg-[#f7b125]/20 text-[#b47d00] font-bold';
      case 'basse':
        return 'bg-[#e7f3ff] text-[#1877f2] font-semibold';
      case 'normale':
      default:
        return 'bg-[#f0f2f5] text-[#65676b] font-semibold';
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#f0f2f5] p-4 md:p-6 overflow-y-auto">
      {/* Header in Facebook Card Style */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e4e6eb] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#fa383e] text-white flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#050505]">
              Rappels & Échéances
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#65676b] mt-1 font-medium">
            Programmez vos alertes sonores et notifications au moment fixé avec début et fin.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Programmer un rappel</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#65676b] pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un rappel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-[#ced0d4] rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-[#050505] placeholder-[#65676b] focus:outline-none focus:border-[#1877f2]"
          />
        </div>

        {/* Status Filters in Facebook Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
          {(['tous', 'actif', 'termine'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                playCyberSound('click');
                setFilterStatut(st);
              }}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full capitalize transition-all cursor-pointer ${
                filterStatut === st
                  ? 'bg-[#1877f2] text-white font-bold shadow-xs'
                  : 'bg-white border border-[#ced0d4] text-[#65676b] hover:bg-[#e4e6eb] hover:text-[#050505]'
              }`}
            >
              {st === 'tous' ? 'Tous les rappels' : st === 'actif' ? 'Actifs' : 'Terminés'}
            </button>
          ))}
        </div>
      </div>

      {/* Rappels Grid */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-[#e4e6eb] rounded-2xl bg-white shadow-sm my-auto">
          <div className="w-16 h-16 rounded-full bg-[#f0f2f5] flex items-center justify-center text-[#65676b] mb-3">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#050505]">Aucun rappel trouvé</h3>
          <p className="text-xs sm:text-sm text-[#65676b] max-w-sm mt-1">
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
                className={`bg-white rounded-2xl border border-[#e4e6eb] p-4 sm:p-5 flex flex-col justify-between group shadow-sm hover:shadow-md transition-all space-y-3 ${
                  isCompleted ? 'opacity-70 bg-[#f8f9fa]' : ''
                }`}
              >
                <div>
                  {/* Top line with Priority, Test Sound & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-[#f0f2f5]">
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${getPriorityBadge(rappel.priorite)}`}>
                      {rappel.priorite}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Modifier */}
                      <button
                        onClick={() => handleOpenEdit(rappel)}
                        title="Modifier"
                        className="p-1.5 rounded-full hover:bg-[#f0f2f5] text-[#65676b] hover:text-[#050505] transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          playReminderAlarmSound();
                        }}
                        title="Tester le son d'alerte"
                        className="p-1.5 rounded-full hover:bg-[#f0f2f5] text-[#65676b] hover:text-[#1877f2] transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          playCyberSound('click');
                          exportItemToPDF('rappel', rappel);
                        }}
                        title="Exporter en PDF"
                        className="p-1.5 rounded-full hover:bg-[#f0f2f5] text-[#65676b] hover:text-[#1877f2] transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          playCyberSound('alert');
                          onDeleteRappel(rappel.id);
                        }}
                        title="Supprimer"
                        className="p-1.5 rounded-full hover:bg-rose-50 text-[#65676b] hover:text-[#fa383e] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
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
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                        isCompleted
                          ? 'bg-[#42b72a] border-[#42b72a] text-white'
                          : 'bg-white border-[#ced0d4] text-transparent hover:border-[#1877f2]'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <h3 className={`text-base font-bold truncate ${isCompleted ? 'line-through text-[#65676b]' : 'text-[#050505]'}`}>
                        {rappel.titre}
                      </h3>
                      {rappel.description && (
                        <p className="text-xs sm:text-sm text-[#65676b] mt-1 line-clamp-2 leading-relaxed">
                          {rappel.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dates & Times (Start + End) */}
                <div className="pt-2 border-t border-[#f0f2f5] space-y-1.5 text-xs text-[#65676b]">
                  {/* Start Date & Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#fa383e] shrink-0" />
                      <span>
                        <span className="font-semibold text-[#050505]">Début : </span>
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
                      className="text-xs font-bold text-[#1877f2] hover:underline flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      Modifier
                    </button>
                  </div>

                  {/* End Date & Time if defined */}
                  {rappel.dateFinRappel && (
                    <div className="flex items-center gap-1.5 text-[#65676b] pt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-[#f7b125] shrink-0" />
                      <span>
                        <span className="font-semibold text-[#050505]">Fin : </span>
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

      {/* Add / Edit Modal in Facebook Style */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#ced0d4] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-[#050505] flex items-center gap-2">
              {editingRappel ? (
                <>
                  <Pencil className="w-5 h-5 text-[#1877f2]" />
                  Modifier le Rappel
                </>
              ) : (
                <>
                  <Bell className="w-5 h-5 text-[#fa383e]" />
                  Nouveau Rappel & Alerte
                </>
              )}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#65676b] mb-1">Titre du rappel *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Rendez-vous médical, réunion projet..."
                  className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3.5 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#65676b] mb-1">Description (optionnelle)</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Détails supplémentaires..."
                  className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl p-2.5 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                />
              </div>

              {/* Date & Heure de Début / Moment fixé */}
              <div className="bg-[#f0f2f5] border border-[#ced0d4] rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#050505]">
                  <Clock className="w-4 h-4 text-[#1877f2]" />
                  <span>Date & Heure de début</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-[#65676b] mb-0.5">Date</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-white border border-[#ced0d4] rounded-lg px-2.5 py-1.5 text-xs text-[#050505] focus:outline-none focus:border-[#1877f2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#65676b] mb-0.5">Heure</label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full bg-white border border-[#ced0d4] rounded-lg px-2.5 py-1.5 text-xs text-[#050505] focus:outline-none focus:border-[#1877f2]"
                    />
                  </div>
                </div>
              </div>

              {/* Case à cocher Date de fin de rappel */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-[#050505]">
                  <input
                    type="checkbox"
                    checked={hasEndDate}
                    onChange={(e) => setHasEndDate(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#f0f2f5] border-[#ced0d4] text-[#1877f2] focus:ring-[#1877f2] cursor-pointer accent-[#1877f2]"
                  />
                  <span>Définir une date de fin de rappel</span>
                </label>

                {hasEndDate && (
                  <div className="bg-[#f0f2f5] border border-[#ced0d4] rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#050505]">
                      <Calendar className="w-4 h-4 text-[#f7b125]" />
                      <span>Date & Heure de fin</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-[#65676b] mb-0.5">Date de fin</label>
                        <input
                          type="date"
                          value={newEndDate}
                          min={newDate || undefined}
                          onChange={(e) => setNewEndDate(e.target.value)}
                          className="w-full bg-white border border-[#ced0d4] rounded-lg px-2.5 py-1.5 text-xs text-[#050505] focus:outline-none focus:border-[#1877f2]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#65676b] mb-0.5">Heure de fin</label>
                        <input
                          type="time"
                          value={newEndTime}
                          onChange={(e) => setNewEndTime(e.target.value)}
                          className="w-full bg-white border border-[#ced0d4] rounded-lg px-2.5 py-1.5 text-xs text-[#050505] focus:outline-none focus:border-[#1877f2]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#65676b] mb-1">Priorité</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Priority)}
                  className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3.5 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                >
                  <option value="basse">Basse</option>
                  <option value="normale">Normale</option>
                  <option value="haute">Haute</option>
                  <option value="critique">Critique</option>
                </select>
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
