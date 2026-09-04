import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bookmark, 
  Brain, 
  Bell, 
  CheckSquare, 
  Calendar, 
  Check, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { Priority } from '../types';
import { playCyberSound } from '../utils/security';

export type DestinationType = 'favoris' | 'memoire' | 'rappels' | 'taches' | 'agenda';

interface SaveToDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageText: string;
  onSave: (
    destination: DestinationType,
    text: string,
    options?: { title?: string; date?: string; time?: string; priority?: Priority }
  ) => Promise<void>;
}

const DESTINATIONS: {
  id: DestinationType;
  label: string;
  badge: string;
  description: string;
  icon: any;
  colorClass: string;
  bgLight: string;
  borderClass: string;
}[] = [
  {
    id: 'favoris',
    label: 'Favoris',
    badge: 'Sauvegarde permanente',
    description: 'Enregistrer dans vos favoris pour un accès rapide et durable.',
    icon: Bookmark,
    colorClass: 'text-amber-500',
    bgLight: 'bg-amber-500/10 hover:bg-amber-500/15',
    borderClass: 'border-amber-500/30 data-[active=true]:border-amber-500 data-[active=true]:bg-amber-500/20',
  },
  {
    id: 'memoire',
    label: 'Mémoire & Notes',
    badge: 'Contexte IA & Prise de note',
    description: 'Mémoriser dans les données de connaissances de Major2I.A.',
    icon: Brain,
    colorClass: 'text-purple-500',
    bgLight: 'bg-purple-500/10 hover:bg-purple-500/15',
    borderClass: 'border-purple-500/30 data-[active=true]:border-purple-500 data-[active=true]:bg-purple-500/20',
  },
  {
    id: 'rappels',
    label: 'Rappels',
    badge: 'Alerte & Notification',
    description: 'Créer un rappel avec sonnerie et notification programmée.',
    icon: Bell,
    colorClass: 'text-rose-500',
    bgLight: 'bg-rose-500/10 hover:bg-rose-500/15',
    borderClass: 'border-rose-500/30 data-[active=true]:border-rose-500 data-[active=true]:bg-rose-500/20',
  },
  {
    id: 'taches',
    label: 'Tâches',
    badge: 'Todo & Projet',
    description: 'Ajouter une tâche à votre gestionnaire d’actions à accomplir.',
    icon: CheckSquare,
    colorClass: 'text-emerald-500',
    bgLight: 'bg-emerald-500/10 hover:bg-emerald-500/15',
    borderClass: 'border-emerald-500/30 data-[active=true]:border-emerald-500 data-[active=true]:bg-emerald-500/20',
  },
  {
    id: 'agenda',
    label: 'Agenda & Calendrier',
    badge: 'Événement & Planning',
    description: 'Planifier un événement daté et visible sur votre calendrier.',
    icon: Calendar,
    colorClass: 'text-sky-500',
    bgLight: 'bg-sky-500/10 hover:bg-sky-500/15',
    borderClass: 'border-sky-500/30 data-[active=true]:border-sky-500 data-[active=true]:bg-sky-500/20',
  },
];

export const SaveToDestinationModal: React.FC<SaveToDestinationModalProps> = ({
  isOpen,
  onClose,
  messageText,
  onSave,
}) => {
  const [selectedDestination, setSelectedDestination] = useState<DestinationType>('favoris');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [priority, setPriority] = useState<Priority>('normale');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or update fields whenever modal opens with new message
  useEffect(() => {
    if (isOpen && messageText) {
      const trimmed = messageText.trim();
      const firstLine = trimmed.split('\n')[0].replace(/^[*#\-_•\s]+/, '').trim();
      const cleanTitle = firstLine.slice(0, 60) || 'Demande enregistrée';
      setTitle(cleanTitle);
      setContent(trimmed);
      
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setTime('09:00');
      setPriority('normale');
    }
  }, [isOpen, messageText]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSaving(true);
    playCyberSound('click');
    try {
      await onSave(selectedDestination, content, {
        title: title.trim() || 'Élément enregistré',
        date: date || undefined,
        time: time || undefined,
        priority,
      });
      onClose();
    } catch (err) {
      console.error('Erreur enregistrement destination:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeDestObj = DESTINATIONS.find((d) => d.id === selectedDestination) || DESTINATIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-[var(--fb-card)] border border-[var(--fb-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--fb-border)] bg-[var(--fb-surface)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--fb-blue)]/15 text-[var(--fb-blue)] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--fb-text-primary)]">
                Enregistrer la demande
              </h3>
              <p className="text-xs text-[var(--fb-text-secondary)]">
                Choisissez la destination selon votre choix
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)] hover:bg-[var(--fb-surface)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Destination Selector Tabs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--fb-text-secondary)] mb-2">
              Destination de votre choix :
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DESTINATIONS.map((dest) => {
                const Icon = dest.icon;
                const isSelected = selectedDestination === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    data-active={isSelected}
                    onClick={() => {
                      playCyberSound('beep');
                      setSelectedDestination(dest.id);
                      if (dest.id === 'agenda' && time === '12:00') setTime('09:00');
                      if (dest.id === 'rappels' && time === '09:00') setTime('12:00');
                    }}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? `${dest.borderClass} ring-2 ring-[var(--fb-blue)]/30 shadow-xs`
                        : `${dest.bgLight} border-[var(--fb-border)] opacity-85 hover:opacity-100`
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-[var(--fb-card)] ${dest.colorClass} shrink-0 shadow-xs`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--fb-text-primary)]">
                          {dest.label}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-[var(--fb-blue)] text-white flex items-center justify-center text-[10px]">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--fb-text-secondary)] line-clamp-1 mt-0.5">
                        {dest.badge}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields according to Destination */}
          <div className="space-y-3 pt-2 border-t border-[var(--fb-border-light)]">
            {/* Title Field */}
            <div>
              <label className="block text-xs font-bold text-[var(--fb-text-primary)] mb-1">
                Titre de l'enregistrement
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--fb-surface)] border border-[var(--fb-border)] text-sm text-[var(--fb-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--fb-blue)]"
                required
              />
            </div>

            {/* Date & Time if Rappel, Agenda, or Tâche */}
            {(selectedDestination === 'rappels' || selectedDestination === 'agenda' || selectedDestination === 'taches') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--fb-text-primary)] mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[var(--fb-blue)]" />
                    <span>{selectedDestination === 'taches' ? 'Échéance' : 'Date de programmation'}</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--fb-surface)] border border-[var(--fb-border)] text-sm text-[var(--fb-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--fb-blue)]"
                    required
                  />
                </div>

                {selectedDestination !== 'taches' && (
                  <div>
                    <label className="block text-xs font-bold text-[var(--fb-text-primary)] mb-1 flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5 text-[var(--fb-blue)]" />
                      <span>Heure</span>
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--fb-surface)] border border-[var(--fb-border)] text-sm text-[var(--fb-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--fb-blue)]"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            {/* Priority Field */}
            {(selectedDestination === 'rappels' || selectedDestination === 'agenda' || selectedDestination === 'taches') && (
              <div>
                <label className="block text-xs font-bold text-[var(--fb-text-primary)] mb-1">
                  Niveau de priorité
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['basse', 'normale', 'haute'] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-1.5 px-2 text-xs font-bold rounded-lg border capitalize transition-all cursor-pointer ${
                        priority === p
                          ? 'bg-[var(--fb-blue)] text-white border-[var(--fb-blue)] shadow-xs'
                          : 'bg-[var(--fb-surface)] text-[var(--fb-text-secondary)] border-[var(--fb-border)] hover:bg-[var(--fb-hover)]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Content / Notes Field */}
            <div>
              <label className="block text-xs font-bold text-[var(--fb-text-primary)] mb-1">
                Contenu & Détails
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-[var(--fb-surface)] border border-[var(--fb-border)] text-sm text-[var(--fb-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--fb-blue)] resize-none"
                placeholder="Détails du message ou de la demande..."
                required
              />
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--fb-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--fb-text-secondary)] hover:bg-[var(--fb-surface)] transition-colors cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSaving || !content.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--fb-blue)] hover:bg-[var(--fb-blue-hover)] text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer dans {activeDestObj.label}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
