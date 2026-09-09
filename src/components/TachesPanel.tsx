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

  const columns: { 
    id: TaskStatus; 
    title: string; 
    badgeColor: string;
    count: number; 
  }[] = [
    { 
      id: 'attente', 
      title: 'En Attente', 
      badgeColor: 'bg-[#f7b125]/20 text-[#b47d00]',
      count: enAttente 
    },
    { 
      id: 'cours', 
      title: 'En Cours', 
      badgeColor: 'bg-[#e7f3ff] text-[#1877f2]',
      count: enCours 
    },
    { 
      id: 'termine', 
      title: 'Terminé', 
      badgeColor: 'bg-[#42b72a]/20 text-[#42b72a]',
      count: terminees 
    },
  ];

  const displayColumns = mobileTab === 'tous' ? columns : columns.filter(c => c.id === mobileTab);

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#f0f2f5] p-3 sm:p-5 md:p-6 overflow-y-auto">
      {/* Header Bar in Facebook Card Style */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e4e6eb] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#42b72a] text-white flex items-center justify-center shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#050505]">
              Tableau des Tâches & Projets
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#65676b] mt-1 font-medium">
            Organisez, suivez et complétez vos activités en toute simplicité.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold text-sm shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Tâche</span>
        </button>
      </div>

      {/* Progress Metric Bar */}
      <div className="my-3 sm:my-4 p-4 border border-[#e4e6eb] rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span className="flex items-center gap-1.5 text-[#050505] font-bold">
            <Layers className="w-4 h-4 text-[#1877f2] shrink-0" />
            <span>Progression globale</span>
          </span>
          <span className="text-[#050505] font-bold text-xs sm:text-sm shrink-0">
            {pourcentage}% ({terminees}/{total})
          </span>
        </div>

        <div className="w-full h-2.5 bg-[#f0f2f5] rounded-full overflow-hidden border border-[#e4e6eb]">
          <div 
            className="h-full bg-[#42b72a] transition-all duration-500 rounded-full"
            style={{ width: `${pourcentage}%` }}
          />
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex sm:hidden items-center gap-1.5 mb-3 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setMobileTab('tous')}
          className={`text-xs px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
            mobileTab === 'tous'
              ? 'bg-[#1877f2] text-white shadow-xs'
              : 'bg-white border border-[#ced0d4] text-[#65676b]'
          }`}
        >
          Toutes ({total})
        </button>
        {columns.map((c) => (
          <button
            key={c.id}
            onClick={() => setMobileTab(c.id)}
            className={`text-xs px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
              mobileTab === c.id
                ? 'bg-[#1877f2] text-white shadow-xs'
                : 'bg-white border border-[#ced0d4] text-[#65676b]'
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
              className="flex flex-col bg-[#f0f2f5] md:bg-white rounded-2xl md:border md:border-[#e4e6eb] p-3 sm:p-4 md:shadow-sm min-h-[300px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e4e6eb] font-bold text-sm text-[#050505]">
                <div className="flex items-center gap-2">
                  <span>{col.title}</span>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${col.badgeColor}`}>
                  {col.count}
                </span>
              </div>

              {/* Tasks List */}
              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-[#ced0d4] rounded-2xl text-xs text-[#65676b] bg-white md:bg-[#f0f2f5]">
                    Aucune tâche dans cette colonne
                  </div>
                ) : (
                  colTasks.map((tache) => (
                    <div
                      key={tache.id}
                      className="bg-white rounded-2xl border border-[#e4e6eb] p-3.5 space-y-2.5 group shadow-sm hover:shadow-md transition-all"
                    >
                      {/* Priority & Top Actions */}
                      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-[#f0f2f5]">
                        <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${getPriorityBadge(tache.priorite)}`}>
                          {tache.priorite}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Modifier */}
                          <button
                            onClick={() => handleOpenEdit(tache)}
                            title="Modifier"
                            className="p-1.5 rounded-full hover:bg-[#f0f2f5] text-[#65676b] hover:text-[#050505] transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              playCyberSound('click');
                              exportItemToPDF('tache', tache);
                            }}
                            title="Exporter en PDF"
                            className="p-1.5 rounded-full hover:bg-[#f0f2f5] text-[#65676b] hover:text-[#1877f2] transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              playCyberSound('alert');
                              onDeleteTache(tache.id);
                            }}
                            title="Supprimer"
                            className="p-1.5 rounded-full hover:bg-rose-50 text-[#65676b] hover:text-[#fa383e] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Desc */}
                      <div>
                        <h4 className="text-sm font-bold text-[#050505] leading-tight">
                          {tache.titre}
                        </h4>
                        {tache.description && (
                          <p className="text-xs text-[#65676b] mt-1 line-clamp-2 leading-relaxed font-medium">
                            {tache.description}
                          </p>
                        )}
                      </div>

                      {/* Due Date & Movement Controls */}
                      <div className="pt-2 border-t border-[#f0f2f5] flex items-center justify-between gap-2 text-xs">
                        <span className="text-[11px] text-[#65676b] flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3 text-[#65676b]" />
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
                            className="text-xs font-bold text-[#1877f2] hover:underline flex items-center gap-0.5 mr-1"
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
                              className="p-1 bg-[#f0f2f5] hover:bg-[#e4e6eb] rounded-full text-[#050505] transition-colors cursor-pointer"
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
                              className="p-1 bg-[#1877f2] hover:bg-[#166fe5] rounded-full text-white transition-colors cursor-pointer shadow-xs"
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

      {/* Add / Edit Modal in Facebook Style */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-[#ced0d4] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-[#050505] flex items-center gap-2">
              {editingTache ? (
                <>
                  <Pencil className="w-5 h-5 text-[#1877f2]" />
                  Modifier la Tâche
                </>
              ) : (
                <>
                  <CheckSquare className="w-5 h-5 text-[#42b72a]" />
                  Nouvelle Tâche
                </>
              )}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#65676b] mb-1">Titre de la tâche *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Rédiger le rapport d'activité..."
                  className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3.5 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#65676b] mb-1">Description (optionnelle)</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Détails de la tâche..."
                  className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl p-2.5 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#65676b] mb-1">Échéance</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-[#f0f2f5] border border-[#ced0d4] rounded-xl px-3 py-2 text-sm text-[#050505] focus:bg-white focus:outline-none focus:border-[#1877f2]"
                  />
                </div>
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
              </div>

              {editingTache && (
                <div>
                  <label className="block text-xs font-bold text-[#65676b] mb-1">Statut / Colonne</label>
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
