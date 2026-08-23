import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  CheckSquare, 
  Clock, 
  Pencil, 
  Trash2,
  Calendar as CalendarSmallIcon
} from 'lucide-react';
import { Rappel, Tache, TaskStatus, Priority } from '../types';
import { playCyberSound } from '../utils/security';

interface CalendarPanelProps {
  rappels: Rappel[];
  taches: Tache[];
  onUpdateRappel?: (rappel: Rappel) => Promise<void>;
  onUpdateTache?: (tache: Tache) => Promise<void>;
  onDeleteRappel?: (id: number) => Promise<void>;
  onDeleteTache?: (id: number) => Promise<void>;
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({ 
  rappels, 
  taches,
  onUpdateRappel,
  onUpdateTache,
  onDeleteRappel,
  onDeleteTache,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    new Date().toISOString().split('T')[0]
  );

  // Edit Modal State inside Calendar
  const [editingItem, setEditingItem] = useState<{ type: 'rappel' | 'tache'; data: any } | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [hasEditEndDate, setHasEditEndDate] = useState(false);
  const [editPriority, setEditPriority] = useState<Priority>('normale');
  const [editStatus, setEditStatus] = useState<TaskStatus>('attente');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Monday-first indexing (0 = Monday, 6 = Sunday)
  const startingDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate);

  // Group events by date string "YYYY-MM-DD"
  const eventsByDate = new Map<string, { type: 'rappel' | 'tache'; title: string; item: any }[]>();

  rappels
    .filter((r) => r.statut !== 'termine' && r.dateRappel)
    .forEach((r) => {
      const key = r.dateRappel!;
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key)!.push({ type: 'rappel', title: r.titre, item: r });
    });

  taches
    .filter((t) => t.status !== 'termine' && t.echeance)
    .forEach((t) => {
      const key = t.echeance!;
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key)!.push({ type: 'tache', title: t.titre, item: t });
    });

  const changeMonth = (offset: number) => {
    playCyberSound('click');
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const dayCells = [];
  for (let i = 0; i < startingDayIndex; i++) {
    dayCells.push({ empty: true, key: `empty-${i}` });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = eventsByDate.get(dStr)?.length || 0;
    const isToday = dStr === new Date().toISOString().split('T')[0];
    const isSelected = dStr === selectedDateKey;

    dayCells.push({
      empty: false,
      dayNumber: d,
      dateKey: dStr,
      count,
      isToday,
      isSelected,
    });
  }

  const selectedDateEvents = selectedDateKey ? eventsByDate.get(selectedDateKey) || [] : [];

  const handleOpenEdit = (ev: { type: 'rappel' | 'tache'; item: any }) => {
    playCyberSound('click');
    setEditingItem({ type: ev.type, data: ev.item });
    setEditTitle(ev.item.titre || '');
    setEditDesc(ev.item.description || '');
    setEditPriority(ev.item.priorite || 'normale');

    if (ev.type === 'rappel') {
      const r = ev.item as Rappel;
      setEditDate(r.dateRappel || '');
      setEditTime(r.heure || '');
      setEditEndDate(r.dateFinRappel || '');
      setEditEndTime(r.heureFin || '');
      setHasEditEndDate(Boolean(r.dateFinRappel || r.heureFin));
    } else {
      const t = ev.item as Tache;
      setEditDate(t.echeance || '');
      setEditStatus(t.status || 'attente');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim()) return;

    if (editingItem.type === 'rappel' && onUpdateRappel) {
      await onUpdateRappel({
        ...editingItem.data,
        titre: editTitle.trim(),
        description: editDesc.trim() || undefined,
        dateRappel: editDate || undefined,
        heure: editTime || undefined,
        dateFinRappel: hasEditEndDate && editEndDate ? editEndDate : undefined,
        heureFin: hasEditEndDate && editEndTime ? editEndTime : undefined,
        priorite: editPriority,
      });
      playCyberSound('success');
    } else if (editingItem.type === 'tache' && onUpdateTache) {
      await onUpdateTache({
        ...editingItem.data,
        titre: editTitle.trim(),
        description: editDesc.trim() || undefined,
        echeance: editDate || undefined,
        priorite: editPriority,
        status: editStatus,
      });
      playCyberSound('success');
    }

    setEditingItem(null);
  };

  const handleDelete = async (ev: { type: 'rappel' | 'tache'; item: any }) => {
    playCyberSound('alert');
    if (ev.type === 'rappel' && onDeleteRappel) {
      await onDeleteRappel(ev.item.id);
    } else if (ev.type === 'tache' && onDeleteTache) {
      await onDeleteTache(ev.item.id);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#030914]/50 p-3 sm:p-5 md:p-6 overflow-y-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-white">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Agenda & Calendrier
            </h1>
          </div>
          <p className="text-sm text-slate-300 mt-0.5 font-medium">
            Visualisez, modifiez ✏️ et gérez tous vos rappels et échéances par date.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-slate-900 border border-white px-3 py-1.5 rounded-xl shadow-sm">
          <button
            onClick={() => changeMonth(-1)}
            className="p-1 border border-white rounded-lg bg-slate-800 text-white hover:bg-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="capitalize font-bold text-sm text-white px-2">
            {monthName}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="p-1 border border-white rounded-lg bg-slate-800 text-white hover:bg-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar + Events Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-4">
        {/* Calendar View */}
        <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl border border-white p-4 shadow-md">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-white mb-2 py-1 border-b border-white">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mer</span>
            <span>Jeu</span>
            <span>Ven</span>
            <span>Sam</span>
            <span>Dim</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {dayCells.map((cell) => {
              if (cell.empty) {
                return <div key={cell.key} className="h-14 sm:h-18 rounded-xl bg-transparent" />;
              }

              return (
                <button
                  key={cell.dateKey}
                  onClick={() => {
                    playCyberSound('click');
                    setSelectedDateKey(cell.dateKey!);
                  }}
                  className={`h-14 sm:h-18 p-1.5 rounded-xl border border-white flex flex-col justify-between items-start transition-all relative ${
                    cell.isSelected
                      ? 'bg-sky-600/50 text-white font-bold ring-2 ring-white'
                      : cell.isToday
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-950 text-slate-200 hover:bg-slate-850 hover:text-white'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-semibold">{cell.dayNumber}</span>
                  {cell.count! > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold self-end border border-white">
                      {cell.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Events Detail Panel */}
        <div className="bg-slate-900/90 rounded-2xl border border-white p-4 flex flex-col shadow-md">
          <h3 className="text-base font-bold text-white pb-2 mb-3 border-b border-white flex items-center justify-between">
            <span>Événements du jour</span>
            {selectedDateKey && (
              <span className="text-xs font-semibold text-white">
                {new Date(selectedDateKey).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
            )}
          </h3>

          <div className="flex-1 space-y-2.5 overflow-y-auto">
            {selectedDateEvents.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-white rounded-xl text-xs text-slate-300">
                Aucun événement prévu pour cette date.
              </div>
            ) : (
              selectedDateEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-950 rounded-xl border border-white space-y-1.5 shadow-sm hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase flex items-center gap-1 text-white">
                      {ev.type === 'rappel' ? (
                        <Bell className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {ev.type === 'rappel' ? 'Rappel' : 'Tâche'}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Modifier ✏️ */}
                      <button
                        onClick={() => handleOpenEdit(ev)}
                        title="Modifier ✏️"
                        className="p-1 border border-white rounded-lg bg-sky-950/60 text-sky-300 hover:bg-sky-900 hover:text-white transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(ev)}
                        title="Supprimer"
                        className="p-1 border border-white rounded-lg bg-rose-950/60 text-rose-300 hover:bg-rose-900 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-white leading-snug">
                    {ev.title}
                  </p>

                  {ev.item.description && (
                    <p className="text-xs text-slate-300 line-clamp-2">
                      {ev.item.description}
                    </p>
                  )}

                  <div className="pt-1 flex items-center justify-between text-xs text-slate-300">
                    {ev.item.heure ? (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {ev.item.heure}
                        {ev.item.heureFin ? ` - ${ev.item.heureFin}` : ''}
                      </span>
                    ) : (
                      <span />
                    )}

                    <button
                      onClick={() => handleOpenEdit(ev)}
                      className="text-[11px] font-semibold text-sky-300 hover:text-sky-200 hover:underline flex items-center gap-0.5"
                    >
                      <Pencil className="w-3 h-3" />
                      Modifier ✏️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal for Calendar Item */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border-2 border-white rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Pencil className="w-5 h-5 text-sky-400" />
              Modifier {editingItem.type === 'rappel' ? 'le Rappel' : 'la Tâche'} dans l'Agenda ✏️
            </h2>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Titre *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-white rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-white rounded-xl p-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              {/* Date & Time fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-900 border border-white rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {editingItem.type === 'rappel' ? 'Heure' : 'Priorité'}
                  </label>
                  {editingItem.type === 'rappel' ? (
                    <input
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full bg-slate-900 border border-white rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                    />
                  ) : (
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as Priority)}
                      className="w-full bg-slate-900 border border-white rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                    >
                      <option value="basse">Basse</option>
                      <option value="normale">Normale</option>
                      <option value="haute">Haute</option>
                      <option value="critique">Critique</option>
                    </select>
                  )}
                </div>
              </div>

              {editingItem.type === 'rappel' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priorité</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as Priority)}
                    className="w-full bg-slate-900 border border-white rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="critique">Critique</option>
                  </select>
                </div>
              )}

              {editingItem.type === 'tache' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Statut</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                    className="w-full bg-slate-900 border border-white rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                  >
                    <option value="attente">En Attente</option>
                    <option value="cours">En Cours</option>
                    <option value="termine">Terminé</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white text-white hover:bg-slate-800 font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 border border-white text-white font-semibold text-sm shadow-md"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
