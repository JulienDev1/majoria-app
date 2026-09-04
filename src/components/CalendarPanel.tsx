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
  Calendar as CalendarSmallIcon,
  Plus,
  CalendarPlus,
  X
} from 'lucide-react';
import { Rappel, Tache, TaskStatus, Priority } from '../types';
import { playCyberSound } from '../utils/security';

interface CalendarPanelProps {
  rappels: Rappel[];
  taches: Tache[];
  onAddRappel?: (rappel: Omit<Rappel, 'id' | 'statut' | 'dateCreation'>) => Promise<void>;
  onAddTache?: (tache: Omit<Tache, 'id' | 'status' | 'dateCreation'>) => Promise<void>;
  onUpdateRappel?: (rappel: Rappel) => Promise<void>;
  onUpdateTache?: (tache: Tache) => Promise<void>;
  onDeleteRappel?: (id: number) => Promise<void>;
  onDeleteTache?: (id: number) => Promise<void>;
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({ 
  rappels, 
  taches,
  onAddRappel,
  onAddTache,
  onUpdateRappel,
  onUpdateTache,
  onDeleteRappel,
  onDeleteTache,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    new Date().toISOString().split('T')[0]
  );

  // Modal Create Event State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEventType, setNewEventType] = useState<'rappel' | 'tache'>('rappel');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newEndDate, setNewEndDate] = useState('');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [hasNewEndDate, setHasNewEndDate] = useState(false);
  const [newPriority, setNewPriority] = useState<Priority>('normale');
  const [newStatus, setNewStatus] = useState<TaskStatus>('attente');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Open Create Modal
  const handleOpenCreate = (targetDate?: string) => {
    playCyberSound('click');
    const defaultDate = targetDate || selectedDateKey || new Date().toISOString().split('T')[0];
    setNewDate(defaultDate);
    setNewEndDate(defaultDate);
    setNewTitle('');
    setNewDesc('');
    setNewTime('09:00');
    setNewEndTime('10:00');
    setHasNewEndDate(false);
    setNewPriority('normale');
    setNewStatus('attente');
    setNewEventType('rappel');
    setIsCreateOpen(true);
  };

  // Submit Create Event
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (newEventType === 'rappel') {
        if (onAddRappel) {
          await onAddRappel({
            titre: newTitle.trim(),
            description: newDesc.trim() || undefined,
            dateRappel: newDate || new Date().toISOString().split('T')[0],
            heure: newTime || '09:00',
            dateFinRappel: hasNewEndDate && newEndDate ? newEndDate : undefined,
            heureFin: hasNewEndDate && newEndTime ? newEndTime : undefined,
            priorite: newPriority,
          });
        }
      } else {
        if (onAddTache) {
          await onAddTache({
            titre: newTitle.trim(),
            description: newDesc.trim() || undefined,
            echeance: newDate || new Date().toISOString().split('T')[0],
            priorite: newPriority,
          });
        }
      }

      if (newDate) {
        setSelectedDateKey(newDate);
      }
      playCyberSound('success');
      setIsCreateOpen(false);
    } catch (err) {
      console.error('Erreur création événement:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
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
      setEditEndDate(r.dateFinRappel || r.dateRappel || '');
      setEditEndTime(r.heureFin || '');
      setHasEditEndDate(Boolean(r.dateFinRappel || r.heureFin));
    } else {
      const t = ev.item as Tache;
      setEditDate(t.echeance || '');
      setEditStatus(t.status || 'attente');
    }
  };

  // Save Edit Event
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

    if (editDate) {
      setSelectedDateKey(editDate);
    }
    setEditingItem(null);
  };

  // Delete Event
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
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e4e6eb] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#1877f2] text-white flex items-center justify-center shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#050505]">
              Agenda & Calendrier
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#65676b] mt-1 font-medium">
            Visualisez, planifiez et gérez tous vos événements, rappels et échéances par date.
          </p>
        </div>

        {/* Action Controls: Month Navigation + Bouton 'Créer un Évènement' */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Navigation Mois */}
          <div className="flex items-center gap-1.5 bg-[#f0f2f5] border border-[#e4e6eb] px-3 py-1.5 rounded-full shadow-2xs">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1 rounded-full hover:bg-[#e4e6eb] text-[#050505] transition-colors cursor-pointer"
              title="Mois précédent"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="capitalize font-bold text-xs sm:text-sm text-[#050505] px-2 min-w-[120px] text-center select-none">
              {monthName}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-1 rounded-full hover:bg-[#e4e6eb] text-[#050505] transition-colors cursor-pointer"
              title="Mois suivant"
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Bouton Créer un Évènement */}
          <button
            id="btn-creer-evenement"
            onClick={() => handleOpenCreate()}
            className="flex items-center gap-2 px-4 py-2 bg-[#1877f2] hover:bg-[#166fe5] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-full shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Créer un Évènement</span>
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
          <div className="pb-2.5 mb-3 border-b border-[#f0f2f5] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#050505]">
                Événements du jour
              </h3>
              {selectedDateKey && (
                <span className="text-xs font-semibold text-[#1877f2] bg-[#e7f3ff] px-2 py-0.5 rounded-full">
                  {new Date(selectedDateKey).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              )}
            </div>

            <button
              id="btn-ajouter-evenement-jour"
              onClick={() => handleOpenCreate(selectedDateKey || undefined)}
              title="Ajouter un événement pour cette date"
              className="flex items-center gap-1 text-xs font-bold text-[#1877f2] hover:bg-[#e7f3ff] px-2.5 py-1 rounded-full transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter</span>
            </button>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto">
            {selectedDateEvents.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#ced0d4] rounded-2xl text-xs text-[#65676b] bg-[#f0f2f5] font-medium space-y-2.5">
                <CalendarSmallIcon className="w-8 h-8 text-[#ced0d4]" />
                <p>Aucun événement prévu pour cette date.</p>
                <button
                  id="btn-creer-evenement-vide"
                  onClick={() => handleOpenCreate(selectedDateKey || undefined)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold text-xs rounded-full shadow-2xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Créer un Évènement</span>
                </button>
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
                        title="Modifier l'événement"
                        className="p-1.5 rounded-full hover:bg-white text-[#65676b] hover:text-[#050505] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ev)}
                        title="Supprimer l'événement"
                        className="p-1.5 rounded-full hover:bg-rose-50 text-[#65676b] hover:text-[#fa383e] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
                      <span className="flex items-center gap-1 text-[11px] font-medium text-[#050505]">
                        <Clock className="w-3 h-3 text-[#1877f2]" />
                        {ev.item.heure}
                        {ev.item.heureFin ? ` - ${ev.item.heureFin}` : ''}
                      </span>
                    ) : (
                      <span />
                    )}

                    <button
                      onClick={() => handleOpenEdit(ev)}
                      className="text-xs font-bold text-[#1877f2] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      Modifier sur l'agenda
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Créer un Évènement */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#ced0d4] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#e4e6eb]">
              <h2 className="text-lg sm:text-xl font-bold text-[#050505] flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-[#1877f2]" />
                Créer un Évènement
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-full text-[#65676b] hover:bg-[#f0f2f5] hover:text-[#050505] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-bold text-[#65676b] mb-1.5">
                  Type d'élément
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewEventType('rappel')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      newEventType === 'rappel'
                        ? 'bg-[#e7f3ff] border-[#1877f2] text-[#1877f2] shadow-2xs'
                        : 'bg-[#f0f2f5] border-[#ced0d4] text-[#65676b] hover:bg-[#e4e6eb]'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Rappel / Événement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEventType('tache')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      newEventType === 'tache'
                        ? 'bg-[#e7f3ff] border-[#1877f2] text-[#1877f2] shadow-2xs'
                        : 'bg-[#f0f2f5] border-[#ced0d4] text-[#65676b] hover:bg-[#e4e6eb]'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Tâche / Échéance</span>
                  </button>
                </div>
              </div>

              {/* Titre */}
              <div>
                <label className="block text-xs font-bold text-[#65676b] mb-1">Titre de l'événement *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Réunion d'équipe, Appel client, Rendez-vous..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3.5 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-[#65676b] mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Détails, liens, adresse ou notes complémentaires..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl p-2.5 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                />
              </div>

              {/* Date & Heure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#65676b] mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#65676b] mb-1">
                    {newEventType === 'rappel' ? 'Heure de début' : 'Priorité'}
                  </label>
                  {newEventType === 'rappel' ? (
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                    />
                  ) : (
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as Priority)}
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

              {/* Pour Rappel : Heure/Date de fin optionnelle */}
              {newEventType === 'rappel' && (
                <div className="bg-[#f0f2f5] p-3 rounded-xl border border-[#e4e6eb] space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#050505] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasNewEndDate}
                      onChange={(e) => setHasNewEndDate(e.target.checked)}
                      className="rounded text-[#1877f2] focus:ring-[#1877f2]"
                    />
                    <span>Définir une heure ou date de fin</span>
                  </label>

                  {hasNewEndDate && (
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#65676b] mb-1">Date de fin</label>
                        <input
                          type="date"
                          value={newEndDate}
                          onChange={(e) => setNewEndDate(e.target.value)}
                          className="w-full bg-white border border-[#ced0d4] rounded-lg px-2.5 py-1.5 text-xs text-[#050505] focus:outline-none focus:border-[#1877f2]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#65676b] mb-1">Heure de fin</label>
                        <input
                          type="time"
                          value={newEndTime}
                          onChange={(e) => setNewEndTime(e.target.value)}
                          className="w-full bg-white border border-[#ced0d4] rounded-lg px-2.5 py-1.5 text-xs text-[#050505] focus:outline-none focus:border-[#1877f2]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Priorité pour Rappel */}
              {newEventType === 'rappel' && (
                <div>
                  <label className="block text-xs font-bold text-[#65676b] mb-1">Priorité</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as Priority)}
                    className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="critique">Critique</option>
                  </select>
                </div>
              )}

              {/* Statut pour Tâche */}
              {newEventType === 'tache' && (
                <div>
                  <label className="block text-xs font-bold text-[#65676b] mb-1">Statut initial</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                    className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                  >
                    <option value="attente">En Attente</option>
                    <option value="cours">En Cours</option>
                    <option value="termine">Terminé</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e4e6eb]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#e4e6eb] hover:bg-[#d8dadf] text-[#050505] font-bold text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold text-xs sm:text-sm shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Enregistrer l'événement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal for Calendar Item in Facebook Style */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#ced0d4] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#e4e6eb]">
              <h2 className="text-lg sm:text-xl font-bold text-[#050505] flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#1877f2]" />
                Modifier {editingItem.type === 'rappel' ? 'le Rappel / Événement' : 'la Tâche'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-full text-[#65676b] hover:bg-[#f0f2f5] hover:text-[#050505] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                <label className="block text-xs font-bold text-[#65676b] mb-1">Description / Notes</label>
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
                    {editingItem.type === 'rappel' ? 'Heure de début' : 'Priorité'}
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

              {/* Date et Heure de fin pour Rappel */}
              {editingItem.type === 'rappel' && (
                <div className="bg-[#f0f2f5] p-3 rounded-xl border border-[#e4e6eb] space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#050505] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasEditEndDate}
                      onChange={(e) => setHasEditEndDate(e.target.checked)}
                      className="rounded text-[#1877f2] focus:ring-[#1877f2]"
                    />
                    <span>Définir une heure ou date de fin</span>
                  </label>

                  {hasEditEndDate && (
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#65676b] mb-1">Date de fin</label>
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={(e) => setEditEndDate(e.target.value)}
                          className="w-full bg-white border border-[#ced0d4] rounded-lg px-2.5 py-1.5 text-xs text-[#050505] focus:outline-none focus:border-[#1877f2]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#65676b] mb-1">Heure de fin</label>
                        <input
                          type="time"
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          className="w-full bg-white border border-[#ced0d4] rounded-lg px-2.5 py-1.5 text-xs text-[#050505] focus:outline-none focus:border-[#1877f2]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e4e6eb]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-full bg-[#e4e6eb] hover:bg-[#d8dadf] text-[#050505] font-bold text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold text-xs sm:text-sm shadow-sm cursor-pointer transition-all active:scale-95"
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
