export type Priority = 'critique' | 'haute' | 'normale' | 'basse';
export type TaskStatus = 'attente' | 'cours' | 'termine';
export type ReminderStatus = 'actif' | 'termine';

export type VoiceGender = 'female' | 'male';

export type AlertSound = 
  | 'zen-crystal' 
  | 'digital-pulse' 
  | 'radar-harmonic' 
  | 'celestial-bell' 
  | 'soft-ping';

export type SubscriptionPlanId = 'basic' | 'premium' | 'pro' | 'custom';
export type BillingInterval = 'month' | 'year';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  monthlyPrice: number;
  annualMonthlyPrice: number; // 20% discount calculated
  periodLabel: string;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  batteryCapacity: string;
  energyPercentValue: number;
  badgeBg: string;
  dotColor: string;
  cardBorder: string;
  buttonBg: string;
  popular?: boolean;
  features: string[];
}

export interface UserSubscription {
  id?: string;
  userId: string;
  planId: SubscriptionPlanId;
  planName?: string;
  status: 'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due' | 'unpaid' | 'free';
  interval: BillingInterval;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  updatedAt?: string;
}

export interface UserProfile {
  prenom: string;
  nom: string;
  email?: string;
  role?: string;
  subscription?: UserSubscription;
}

export interface RolloverEnergyInfo {
  currentMonth?: string; // YYYY-MM
  monthlyEnergy?: number; // 0 to 100%
  rolloverEnergy: number; // Carry-over from previous months
  totalAvailable?: number; // Total energy available
  lastRolloverDate: string;
  carriedFromPreviousMonth?: number;
  history?: Array<{
    month: string;
    unusedReported: number;
    date: string;
  }>;
}

export interface MobileBridgeInfo {
  pairingCode: string;
  isConnected: boolean;
  deviceName?: string;
  lastSync?: string;
  syncPushEnabled: boolean;
  mirrorNotesEnabled: boolean;
  remoteMicEnabled: boolean;
}

export interface Favori {
  id: number;
  titre: string;
  contenu?: string;
  categorie: string;
  date: string;
}

export interface Memoire {
  id: number;
  contenu: string;
  tags: string[];
  importance: number; // 1 to 5
  date: string;
}

export interface Rappel {
  id: number;
  titre: string;
  description?: string;
  dateRappel?: string;
  heure?: string;
  priorite: Priority;
  statut: ReminderStatus;
  dateCreation: string;
}

export interface Tache {
  id: number;
  titre: string;
  description?: string;
  priorite: Priority;
  status: TaskStatus;
  echeance?: string;
  dateCreation: string;
}

export interface MessageSource {
  title: string;
  uri: string;
}

export interface Message {
  id?: string;
  role: 'user' | 'neo' | 'majoria' | 'assistant';
  contenu: string;
  image?: string;
  sources?: MessageSource[];
  searchQueries?: string[];
  date: string;
}

export interface Conversation {
  id: number;
  titre: string;
  messages: Message[];
  tags: string[];
  favori: boolean;
  categorie: string;
  date: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

export interface TranscriptionItem {
  id: number;
  titre: string;
  texte: string;
  dureeSecondes?: number;
  langue?: string;
  date: string;
}

export type PanelId = 'chat' | 'favoris' | 'memoire' | 'rappels' | 'taches' | 'calendar' | 'stats' | 'transcription' | 'pricing' | 'success';
