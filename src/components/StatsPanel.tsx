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
    <div className="flex-1 min-h-0 flex flex-col h-full bg-[#f0f2f5] p-4 md:p-6 overflow-y-auto space-y-4">
      {/* Header in Facebook Card Style */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e4e6eb] shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#1877f2] text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#050505]">
              Statistiques & Vue d'ensemble
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#65676b] mt-1 font-medium">
            Aperçu global de votre activité, de l'état de votre batterie IA et de vos données.
          </p>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div 
              key={idx} 
              className="p-4 sm:p-5 flex flex-col justify-between rounded-2xl bg-white border border-[#e4e6eb] shadow-sm hover:shadow-md transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#65676b]">{m.label}</span>
                <div className="w-8 h-8 rounded-full bg-[#e7f3ff] text-[#1877f2] flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-[#050505] mb-0.5">{m.val}</div>
                <div className="text-xs text-[#65676b] font-medium">{m.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two columns : Tasks & Battery Consumption Report */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Task Completion Progress Section */}
        <div className="bg-white rounded-2xl border border-[#e4e6eb] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#050505] flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[#42b72a]" />
              Taux de réalisation des tâches
            </h3>
            <span className="text-lg font-bold text-[#42b72a]">{taskRatio}%</span>
          </div>

          <div className="w-full h-2.5 bg-[#f0f2f5] rounded-full overflow-hidden border border-[#e4e6eb]">
            <div
              className="h-full rounded-full bg-[#42b72a] transition-all duration-500"
              style={{ width: `${taskRatio}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
            <div className="bg-[#f0f2f5] p-3 rounded-xl border border-[#e4e6eb]">
              <div className="text-[#65676b] mb-0.5 font-semibold">Total</div>
              <div className="text-lg font-bold text-[#050505]">{totalTasks}</div>
            </div>
            <div className="bg-[#f0f2f5] p-3 rounded-xl border border-[#e4e6eb]">
              <div className="text-[#42b72a] mb-0.5 font-semibold">Terminées</div>
              <div className="text-lg font-bold text-[#42b72a]">{doneTasks}</div>
            </div>
            <div className="bg-[#f0f2f5] p-3 rounded-xl border border-[#e4e6eb]">
              <div className="text-[#b47d00] mb-0.5 font-semibold">En cours</div>
              <div className="text-lg font-bold text-[#b47d00]">{totalTasks - doneTasks}</div>
            </div>
          </div>
        </div>

        {/* Battery & Monthly Rollover Breakdown */}
        <div className="bg-white rounded-2xl border border-[#e4e6eb] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#050505] flex items-center gap-2">
              <BatteryCharging className="w-5 h-5 text-[#1877f2]" />
              Consommation & Report d'Énergie
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#e7f3ff] text-[#1877f2] font-bold">
              {effectiveEnergy}% actif
            </span>
          </div>

          <div className="w-full h-2.5 bg-[#f0f2f5] rounded-full overflow-hidden border border-[#e4e6eb]">
            <div
              className="h-full rounded-full bg-[#1877f2] transition-all duration-500"
              style={{ width: `${Math.min(100, effectiveEnergy)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2">
            <div className="p-3 rounded-xl bg-[#f0f2f5] border border-[#e4e6eb] space-y-1">
              <div className="text-[#65676b] font-semibold">Autonomie mensuelle :</div>
              <div className="text-sm sm:text-base font-bold text-[#050505]">{effectiveEnergy}% disponible</div>
            </div>
            <div className="p-3 rounded-xl bg-[#e7f3ff] border border-[#dbe7f2] space-y-1">
              <div className="text-[#1877f2] font-semibold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Report conservé :
              </div>
              <div className="text-sm sm:text-base font-bold text-[#1877f2]">+{rollover}% reporté</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & System Info Footer */}
      <div className="mt-auto pt-4 border-t border-[#e4e6eb] flex flex-wrap items-center justify-between gap-3 text-xs text-[#65676b] font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#42b72a]" />
          <span>MajorI.A • Système optimisé et sécurisé</span>
        </div>
        <div className="flex items-center gap-2 text-[#65676b]">
          <Sparkles className="w-3.5 h-3.5 text-[#1877f2]" />
          <span>Moteur IA & Base de données connectés</span>
        </div>
      </div>
    </div>
  );
};
