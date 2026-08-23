import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  FileText, 
  Calendar, 
  ArrowRight, 
  ArrowLeft, 
  Layers,
  Pencil
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Tache, TaskStatus, Priority } from '../types';
import { playCyberSound } from '../utils/security';
import { exportItemToPDF } from '../utils/pdfExport';

interface TachesPanelProps {
  taches: Tache[];
  onAddTache: (tache: Omit<Tache, 'id' | 'dateCreation' | 'status'>) => Promise<void>;
  onUpdateTache?: (tache: Tache) => Promise<void>;
  onUpdateTacheStatus: (id: number, newStatus: TaskStatus) => Promise<void>;
  onDeleteTache: (id: number) => Promise<void>;
}

export const TachesPanel: React.FC<TachesPanelProps> = ({
  taches,
  onAddTache,
  onUpdateTache,
  onUpdateTacheStatus,
  onDeleteTache,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTache, setEditingTache] = useState<Tache | null>(null);
  const [mobileTab, setMobileTab] = useState<'tous' | TaskStatus>('tous');

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('normale');
  const [newStatus, setNewStatus] = useState<TaskStatus>('attente');

  // Calculations
  const total = taches.length;
  const terminees = taches.filter((t) => t.status === 'termine').length;
  const enCours = taches.filter((t) => t.status === 'cours').length;
  const enAttente = taches.filter((t) => t.status === 'attente').length;
  const pourcentage = total > 0 ? Math.round((terminees / total) * 100) : 0;

  const handleOpenAdd = () => {
    playCyberSound('beep');
    setEditingTache(null);
    setNewTitle('');
    setNewDesc('');
    setNewDueDate('');
    setNewPriority('normale');
    setNewStatus('attente');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tache: Tache) => {
    playCyberSound('click');
    setEditingTache(tache);
    setNewTitle(tache.titre);
    setNewDesc(tache.description || '');
    setNewDueDate(tache.echeance || '');
    setNewPriority(tache.priorite || 'normale');
    setNewStatus(tache.status || 'attente');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (editingTache && onUpdateTache) {
      await onUpdateTache({
        ...editingTache,
        titre: newTitle.trim(),
        description: newDesc.trim() || undefined,
        echeance: newDueDate || undefined,
        priorite: newPriority,
        status: newStatus,
      });
      playCyberSound('success');
    } else {
      await onAddTache({
        titre: newTitle.trim(),
        description: newDesc.trim() || undefined,
        echeance: newDueDate || undefined,
        priorite: newPriority,
      });
    }

    setEditingTache(null);
    setNewTitle('');
    setNewDesc('');
    setNewDueDate('');
    setNewPriority('normale');
    setNewStatus('attente');
    setIsModalOpen(false);
  };

  const handleStatusChange = async (id: number, nextStatus: TaskStatus) => {
    if (nextStatus === 'termine') {
      playCyberSound('success');
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.8 },
      });
    } else {
      playCyberSound('beep');
    }
    await onUpdateTacheStatus(id, nextStatus);
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

  const columns: { 
    id: TaskStatus; 
    title: string; 
    badgeColor: string;
    count: number; 
  }[] = [
    { 
      id: 'attente', 
      title: 'En Attente', 
      badgeColor: 'bg-amber-500/30 text-amber-200 border-white',
      count: enAttente 
    },
    { 
      id: 'cours', 
      title: 'En Cours', 
      badgeColor: 'bg-sky-500/30 text-sky-200 border-white',
      count: enCours 
    },
    { 
      id: 'termine', 
      title: 'Terminé', 
      badgeColor: 'bg-emerald-500/30 text-emerald-200 border-white',
      count: terminees 
    },
  ];

  const displayColumns = mobileTab === 'tous' ? columns : columns.filter(c => c.id === mobileTab);

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#030914]/50 p-3 sm:p-5 md:p-6 overflow-y-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-white">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl md:text-2xl font-bold text-white">
              Tableau des Tâches & Projets
            </h1>
          </div>
          <p className="text-sm text-slate-300 mt-0.5 font-medium">
            Organisez, modifiez ✏️, suivez et complétez vos activités en toute simplicité.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-all border border-white active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Tâche</span>
        </button>
      </div>

      {/* Progress Metric Bar */}
      <div className="my-3 sm:my-4 p-3.5 border border-white rounded-2xl bg-slate-900/90 shadow-md">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span className="flex items-center gap-1.5 text-white">
            <Layers className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Progression globale</span>
          </span>
          <span className="text-white font-bold text-xs sm:text-sm shrink-0">
            {pourcentage}% ({terminees}/{total})
          </span>
        </div>

        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-white p-0.5">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500 rounded-full shadow-sm"
            style={{ width: `${pourcentage}%` }}
          />
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex sm:hidden items-center gap-1.5 mb-3 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setMobileTab('tous')}
          className={`text-xs px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap border border-white transition-all ${
            mobileTab === 'tous'
              ? 'bg-white/25 text-white font-bold ring-2 ring-white'
              : 'bg-slate-900 text-slate-300'
          }`}
        >
          Toutes ({total})
        </button>
        {columns.map((c) => (
          <button
            key={c.id}
            onClick={() => setMobileTab(c.id)}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap border border-white transition-all ${
              mobileTab === c.id
                ? `${c.badgeColor} ring-2 ring-white font-bold`
                : 'bg-slate-900 text-slate-300'
            }`}
          >
            {c.title} ({c.count})
          </button>
        ))}
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
        {displayColumns.map((col) => {
          const colTasks = taches.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className="flex flex-col bg-slate-900/90 rounded-2xl border border-white p-3.5 shadow-md min-h-[300px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white font-bold text-sm text-white">
                <div className="flex items-center gap-2">
                  <span>{col.title}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border border-white ${col.badgeColor}`}>
                  {col.count}
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/40 rounded-xl text-xs text-slate-300">
                    Aucune tâche dans cette colonne
                  </div>
                ) : (
                  colTasks.map((tache) => (
                    <div
                      key={tache.id}
                      className="bg-slate-950 rounded-xl border border-white p-3 space-y-2 group shadow-sm hover:bg-slate-900 transition-all"
                    >
                      {/* Priority & Top Actions */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-white ${getPriorityBadge(tache.priorite)}`}>
                          {tache.priorite}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Modifier ✏️ */}
                          <button
                            onClick={() => handleOpenEdit(tache)}
                            title="Modifier ✏️"
                            className="p-1 border border-white rounded-lg bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 hover:text-white transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              playCyberSound('click');
                              exportItemToPDF('tache', tache);
                            }}
                            title="Exporter en PDF"
                            className="p-1 border border-white rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                          >
                            <FileText className="w-3.5 h-3.5 text-sky-400" />
                          </button>
                          <button
                            onClick={() => {
                              playCyberSound('alert');
                              onDeleteTache(tache.id);
                            }}
                            title="Supprimer"
                            className="p-1 border border-white rounded-lg bg-rose-950/60 text-rose-300 hover:bg-rose-900"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Desc */}
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight">
                          {tache.titre}
                        </h4>
                        {tache.description && (
                          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                            {tache.description}
                          </p>
                        )}
                      </div>

                      {/* Due Date & Movement Controls */}
                      <div className="pt-2 border-t border-white/30 flex items-center justify-between gap-2 text-xs">
                        <span className="text-[11px] text-slate-300 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {tache.echeance
                            ? new Date(tache.echeance).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                              })
                            : 'Pas de date'}
                        </span>

                        {/* Move Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(tache)}
                            className="text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 hover:underline flex items-center gap-0.5 mr-1"
                          >
                            <Pencil className="w-3 h-3" />
                            Modifier
                          </button>

                          {col.id !== 'attente' && (
                            <button
                              onClick={() => {
                                const prev = col.id === 'termine' ? 'cours' : 'attente';
                                handleStatusChange(tache.id, prev);
                              }}
                              title="Déplacer vers la gauche"
                              className="p-1 bg-slate-800 hover:bg-slate-700 border border-white rounded text-white"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                          )}

                          {col.id !== 'termine' && (
                            <button
                              onClick={() => {
                                const next = col.id === 'attente' ? 'cours' : 'termine';
                                handleStatusChange(tache.id, next);
                              }}
                              title="Déplacer vers la droite"
                              className="p-1 bg-slate-800 hover:bg-slate-700 border border-white rounded text-white"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border-2 border-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {editingTache ? (
                <>
                  <Pencil className="w-5 h-5 text-emerald-400" />
                  Modifier la Tâche ✏️
                </>
              ) : (
                <>
                  <CheckSquare className="w-5 h-5 text-emerald-400" />
                  Nouvelle Tâche
                </>
              )}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Titre de la tâche *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Rédiger le rapport d'activité..."
                  className="w-full bg-slate-900 border border-white rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description (optionnelle)</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Détails de la tâche..."
                  className="w-full bg-slate-900 border border-white rounded-xl p-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Échéance</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-white rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                  />
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
              </div>

              {editingTache && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Statut / Colonne</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white text-white hover:bg-slate-800 font-semibold text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-white text-white font-semibold text-sm shadow-md"
                >
                  {editingTache ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
