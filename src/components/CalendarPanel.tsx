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
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#f0f2f5] p-3 sm:p-5 md:p-6 overflow-y-auto">
      {/* Header Bar in Facebook Card Style */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e4e6eb] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#1877f2] text-white flex items-center justify-center shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#050505]">
              Agenda & Calendrier
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#65676b] mt-1 font-medium">
            Visualisez et gérez tous vos rappels et échéances par date.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-[#f0f2f5] border border-[#e4e6eb] px-3 py-1.5 rounded-full">
          <button
            onClick={() => changeMonth(-1)}
            className="p-1.5 rounded-full hover:bg-[#e4e6eb] text-[#050505] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="capitalize font-bold text-xs sm:text-sm text-[#050505] px-2">
            {monthName}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="p-1.5 rounded-full hover:bg-[#e4e6eb] text-[#050505] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar + Events Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-4">
        {/* Calendar View */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e4e6eb] p-4 sm:p-5 shadow-sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-[#65676b] mb-2 py-1 border-b border-[#f0f2f5]">
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
                  className={`h-14 sm:h-18 p-1.5 rounded-xl border flex flex-col justify-between items-start transition-all relative cursor-pointer ${
                    cell.isSelected
                      ? 'bg-[#1877f2] text-white border-[#1877f2] font-bold shadow-xs'
                      : cell.isToday
                      ? 'bg-[#e7f3ff] text-[#1877f2] border-[#1877f2] font-bold'
                      : 'bg-[#f0f2f5] border-[#e4e6eb] text-[#050505] hover:bg-[#e4e6eb]'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-semibold">{cell.dayNumber}</span>
                  {cell.count! > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold self-end ${
                      cell.isSelected ? 'bg-white text-[#1877f2]' : 'bg-[#fa383e] text-white'
                    }`}>
                      {cell.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Events Detail Panel */}
        <div className="bg-white rounded-2xl border border-[#e4e6eb] p-4 sm:p-5 flex flex-col shadow-sm">
          <h3 className="text-base font-bold text-[#050505] pb-2 mb-3 border-b border-[#f0f2f5] flex items-center justify-between">
            <span>Événements du jour</span>
            {selectedDateKey && (
              <span className="text-xs font-semibold text-[#65676b]">
                {new Date(selectedDateKey).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
            )}
          </h3>

          <div className="flex-1 space-y-2.5 overflow-y-auto">
            {selectedDateEvents.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#ced0d4] rounded-2xl text-xs text-[#65676b] bg-[#f0f2f5] font-medium">
                Aucun événement prévu pour cette date.
              </div>
            ) : (
              selectedDateEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#f0f2f5] rounded-xl border border-[#e4e6eb] space-y-1.5 shadow-xs hover:bg-[#e4e6eb] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold uppercase flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      ev.type === 'rappel' ? 'bg-[#fa383e]/15 text-[#fa383e]' : 'bg-[#42b72a]/20 text-[#42b72a]'
                    }`}>
                      {ev.type === 'rappel' ? (
                        <Bell className="w-3.5 h-3.5 text-[#fa383e]" />
                      ) : (
                        <CheckSquare className="w-3.5 h-3.5 text-[#42b72a]" />
                      )}
                      {ev.type === 'rappel' ? 'Rappel' : 'Tâche'}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Modifier */}
                      <button
                        onClick={() => handleOpenEdit(ev)}
                        title="Modifier"
                        className="p-1.5 rounded-full hover:bg-white text-[#65676b] hover:text-[#050505] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(ev)}
                        title="Supprimer"
                        className="p-1.5 rounded-full hover:bg-rose-50 text-[#65676b] hover:text-[#fa383e] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-[#050505] leading-snug">
                    {ev.title}
                  </p>

                  {ev.item.description && (
                    <p className="text-xs text-[#65676b] line-clamp-2 font-medium">
                      {ev.item.description}
                    </p>
                  )}

                  <div className="pt-1 flex items-center justify-between text-xs text-[#65676b]">
                    {ev.item.heure ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium">
                        <Clock className="w-3 h-3 text-[#65676b]" />
                        {ev.item.heure}
                        {ev.item.heureFin ? ` - ${ev.item.heureFin}` : ''}
                      </span>
                    ) : (
                      <span />
                    )}

                    <button
                      onClick={() => handleOpenEdit(ev)}
                      className="text-xs font-bold text-[#1877f2] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      Modifier
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal for Calendar Item in Facebook Style */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#ced0d4] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-[#050505] flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[#1877f2]" />
              Modifier {editingItem.type === 'rappel' ? 'le Rappel' : 'la Tâche'}
            </h2>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#65676b] mb-1">Titre *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3.5 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#65676b] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl p-2.5 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                />
              </div>

              {/* Date & Time fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#65676b] mb-1">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#65676b] mb-1">
                    {editingItem.type === 'rappel' ? 'Heure' : 'Priorité'}
                  </label>
                  {editingItem.type === 'rappel' ? (
                    <input
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                    />
                  ) : (
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as Priority)}
                      className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
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
                  <label className="block text-xs font-bold text-[#65676b] mb-1">Priorité</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as Priority)}
                    className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
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
                  <label className="block text-xs font-bold text-[#65676b] mb-1">Statut</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                    className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                  >
                    <option value="attente">En Attente</option>
                    <option value="cours">En Cours</option>
                    <option value="termine">Terminé</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e4e6eb]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-full bg-[#e4e6eb] hover:bg-[#d8dadf] text-[#050505] font-bold text-xs sm:text-sm cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold text-xs sm:text-sm shadow-sm cursor-pointer"
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
