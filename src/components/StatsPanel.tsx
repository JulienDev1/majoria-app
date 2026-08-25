import React from 'react';
import { 
  BarChart3, 
  ShieldCheck, 
  Activity, 
  HardDrive, 
  BatteryCharging, 
  Database,
  CheckSquare,
  Layers,
  Sparkles
} from 'lucide-react';
import { Favori, Memoire, Rappel, Tache, Conversation, RolloverEnergyInfo, UserProfile } from '../types';

interface StatsPanelProps {
  conversations: Conversation[];
  favoris: Favori[];
  memoire: Memoire[];
  rappels: Rappel[];
  taches: Tache[];
  user: { nom: string } | null;
  userProfile?: UserProfile;
  energyPercent?: number | null;
  rolloverInfo?: RolloverEnergyInfo;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  conversations,
  favoris,
  memoire,
  rappels,
  taches,
  user,
  userProfile,
  energyPercent = 80,
  rolloverInfo,
}) => {
  const totalTasks = taches.length;
  const doneTasks = taches.filter((t) => t.status === 'termine').length;
  const taskRatio = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const activeReminders = rappels.filter((r) => r.statut === 'actif').length;
  const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);

  const effectiveEnergy = typeof energyPercent === 'number' ? energyPercent : 80;
  const rollover = rolloverInfo?.rolloverEnergy || 35;

  const metrics = [
    { 
      label: 'Discussions Actives', 
      val: conversations.length, 
      sub: `${totalMessages} messages échangés`, 
      icon: Activity, 
      color: 'text-sky-300',
    },
    { 
      label: 'Notes & Mémoire', 
      val: memoire.length, 
      sub: 'Informations mémorisées', 
      icon: HardDrive, 
      color: 'text-purple-300',
    },
    { 
      label: 'Favoris Enregistrés', 
      val: favoris.length, 
      sub: 'Prompts & idées clés', 
      icon: Database, 
      color: 'text-amber-300',
    },
    { 
      label: 'Autonomie Batterie IA', 
      val: `${effectiveEnergy}%`, 
      sub: `+${rollover}% reporté du mois précédent`, 
      icon: BatteryCharging, 
      color: 'text-emerald-300',
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#030914]/55 p-4 md:p-6 overflow-y-auto">
      {/* Header */}
      <div className="pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-fuchsia-400" />
          <h1 className="text-xl md:text-2xl font-bold text-white">
            Statistiques & Vue d'ensemble
          </h1>
        </div>
        <p className="text-sm text-slate-300 mt-1 font-medium">
          Aperçu global de votre activité, de l'état de votre batterie IA et de vos données.
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div 
              key={idx} 
              className="p-4 flex flex-col justify-between rounded-2xl bg-white/[0.06] border-[0.5px] border-white/15 shadow-md hover:bg-white/[0.1] transition-all space-y-2"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">{m.label}</span>
                <Icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-0.5">{m.val}</div>
                <div className="text-xs text-slate-300">{m.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two columns : Tasks & Battery Consumption Report */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Task Completion Progress Section */}
        <div className="bg-white/[0.06] rounded-2xl border-[0.5px] border-white/15 p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
              Taux de réalisation des tâches
            </h3>
            <span className="text-lg font-bold text-emerald-400">{taskRatio}%</span>
          </div>

          <div className="w-full h-3 bg-slate-950/80 rounded-full overflow-hidden border-[0.5px] border-white/20 p-0.5">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${taskRatio}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
            <div className="bg-white/[0.03] p-2.5 rounded-xl border-[0.5px] border-white/10">
              <div className="text-slate-400 mb-0.5 font-medium">Total</div>
              <div className="text-lg font-bold text-white">{totalTasks}</div>
            </div>
            <div className="bg-white/[0.03] p-2.5 rounded-xl border-[0.5px] border-white/10">
              <div className="text-emerald-400 mb-0.5 font-medium">Terminées</div>
              <div className="text-lg font-bold text-emerald-400">{doneTasks}</div>
            </div>
            <div className="bg-white/[0.03] p-2.5 rounded-xl border-[0.5px] border-white/10">
              <div className="text-amber-400 mb-0.5 font-medium">En cours</div>
              <div className="text-lg font-bold text-amber-400">{totalTasks - doneTasks}</div>
            </div>
          </div>
        </div>

        {/* Battery & Monthly Rollover Breakdown */}
        <div className="bg-white/[0.06] rounded-2xl border-[0.5px] border-white/15 p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BatteryCharging className="w-5 h-5 text-emerald-400" />
              Consommation & Report d'Énergie
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950/80 border-[0.5px] border-emerald-400/40 text-emerald-300 font-mono font-bold">
              {effectiveEnergy}% actif
            </span>
          </div>

          <div className="w-full h-3 bg-slate-950/80 rounded-full overflow-hidden border-[0.5px] border-white/20 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${Math.min(100, effectiveEnergy)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2">
            <div className="p-3 rounded-xl bg-white/[0.03] border-[0.5px] border-white/10 space-y-1">
              <div className="text-slate-400 font-medium">Autonomie mensuelle :</div>
              <div className="text-base font-bold text-white">{effectiveEnergy}% disponible</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border-[0.5px] border-emerald-500/30 space-y-1">
              <div className="text-emerald-300 font-medium flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Report conservé :
              </div>
              <div className="text-base font-bold text-emerald-300">+{rollover}% reporté</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & System Info Footer */}
      <div className="mt-auto pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>MajorI.A Neural 2026 • Système optimisé et sécurisé</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Moteur IA & Base de données connectés</span>
        </div>
      </div>
    </div>
  );
};
