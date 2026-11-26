export type ContactStatus = 'lead' | 'qualified' | 'customer' | 'churned';

export type DealStage =
  | 'prospection'
  | 'qualification'
  | 'proposition'
  | 'negociation'
  | 'gagne'
  | 'perdu';

export type ActivityType = 'appel' | 'email' | 'reunion' | 'note';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  status: ContactStatus;
  ownerId: string;
  createdAt: string; // ISO-8601 date string
}

export interface Deal {
  id: string;
  title: string;
  contactId: string;
  company: string;
  amount: number; // in EUR
  probability: number; // 0 - 100
  stage: DealStage;
  expectedCloseDate: string; // ISO-8601 date string (YYYY-MM-DD)
  updatedAt: string; // ISO-8601 date string
  ownerId?: string;
  ownerName?: string;
}

export interface Activity {
  id: string;
  dealId: string | null;
  contactId: string;
  type: ActivityType;
  summary: string;
  createdAt: string; // ISO-8601 date string
  authorName: string;
  ownerId?: string;
}

export interface PipelineMetrics {
  /** Sum of amounts for active (open) pipeline deals */
  totalPipelineAmount: number;
  /** Weighted revenue: sum of (amount * probability / 100) for open deals */
  weightedRevenue: number;
  /** Conversion rate in %: won / (won + lost) * 100 */
  conversionRate: number;
  /** Average amount across all deals */
  averageDealValue: number;
  /** Total amount of deals won during the current calendar month */
  wonThisMonthAmount: number;
  /** Count of deals won during the current calendar month */
  wonThisMonthCount: number;
  /** Count of open deals */
  openDealsCount: number;
  /** Count of won deals */
  wonDealsCount: number;
  /** Count of lost deals */
  lostDealsCount: number;
}

export interface StageMetadata {
  id: DealStage;
  label: string;
  defaultProbability: number;
  badgeClass: string;
  accentClass: string;
}

export const DEAL_STAGES: readonly StageMetadata[] = [
  {
    id: 'prospection',
    label: 'Prospection',
    defaultProbability: 15,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    accentClass: 'border-t-slate-400',
  },
  {
    id: 'qualification',
    label: 'Qualification',
    defaultProbability: 35,
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    accentClass: 'border-t-sky-500',
  },
  {
    id: 'proposition',
    label: 'Proposition',
    defaultProbability: 60,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentClass: 'border-t-indigo-500',
  },
  {
    id: 'negociation',
    label: 'Négociation',
    defaultProbability: 80,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    accentClass: 'border-t-amber-500',
  },
  {
    id: 'gagne',
    label: 'Gagné',
    defaultProbability: 100,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentClass: 'border-t-emerald-500',
  },
  {
    id: 'perdu',
    label: 'Perdu',
    defaultProbability: 0,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    accentClass: 'border-t-rose-500',
  },
] as const;

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  lead: 'Lead',
  qualified: 'Qualifié',
  customer: 'Client',
  churned: 'Perdu',
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  appel: 'Appel',
  email: 'Email',
  reunion: 'Réunion',
  note: 'Note',
};

export interface KanbanColumn {
  stage: StageMetadata;
  deals: Deal[];
  totalAmount: number;
  weightedAmount: number;
}

export interface CrmFilterInput {
  contacts: Contact[];
  deals: Deal[];
}

export interface CrmFilterResult {
  contacts: Contact[];
  deals: Deal[];
}

export interface RepForecast {
  ownerId: string;
  ownerName: string;
  openDealsCount: number;
  pipelineAmount: number;
  weightedForecast: number;
  wonAmount: number;
}

export interface MonthlyForecastReport {
  month: string; // YYYY-MM
  generatedAt: string;
  totalPipelineAmount: number;
  totalWeightedForecast: number;
  totalWonAmount: number;
  byRep: RepForecast[];
}

export type NewContactPayload = Omit<Contact, 'id' | 'createdAt'>;
export type NewDealPayload = Omit<Deal, 'id' | 'updatedAt'>;
export type NewActivityPayload = Omit<Activity, 'id' | 'createdAt'>;
