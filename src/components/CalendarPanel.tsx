import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Bell, CheckSquare, Clock } from 'lucide-react';
import { Rappel, Tache } from '../types';
import { playCyberSound } from '../utils/security';

interface CalendarPanelProps {
  rappels: Rappel[];
  taches: Tache[];
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({ rappels, taches }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    new Date().toISOString().split('T')[0]
  );

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
            Visualisez tous vos rappels et échéances par date.
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
                  className="p-3 bg-slate-950 rounded-xl border border-white space-y-1 shadow-sm"
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
                    {ev.item.heure && (
                      <span className="text-[11px] text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {ev.item.heure}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">
                    {ev.title}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
