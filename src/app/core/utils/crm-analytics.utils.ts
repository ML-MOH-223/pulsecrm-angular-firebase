import {
  Activity,
  ActivityType,
  Contact,
  ContactStatus,
  CrmFilterInput,
  CrmFilterResult,
  DEAL_STAGES,
  Deal,
  DealStage,
  KanbanColumn,
  MonthlyForecastReport,
  PipelineMetrics,
  RepForecast,
} from '../models/crm.model';

/**
 * Computes real-time commercial pipeline KPIs from a list of deals.
 * Pure function: deterministic for a given `deals` array and `referenceDate`.
 */
export function computePipelineMetrics(
  deals: readonly Deal[],
  referenceDate: Date = new Date()
): PipelineMetrics {
  if (deals.length === 0) {
    return {
      totalPipelineAmount: 0,
      weightedRevenue: 0,
      conversionRate: 0,
      averageDealValue: 0,
      wonThisMonthAmount: 0,
      wonThisMonthCount: 0,
      openDealsCount: 0,
      wonDealsCount: 0,
      lostDealsCount: 0,
    };
  }

  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth();

  let totalPipelineAmount = 0;
  let weightedRevenue = 0;
  let totalAllAmount = 0;
  let wonThisMonthAmount = 0;
  let wonThisMonthCount = 0;
  let openDealsCount = 0;
  let wonDealsCount = 0;
  let lostDealsCount = 0;

  for (const deal of deals) {
    const amount = Number.isFinite(deal.amount) ? Math.max(0, deal.amount) : 0;
    const probability = Math.min(100, Math.max(0, Number.isFinite(deal.probability) ? deal.probability : 0));

    totalAllAmount += amount;

    if (deal.stage === 'gagne') {
      wonDealsCount++;
      const updated = new Date(deal.updatedAt);
      if (
        !Number.isNaN(updated.getTime()) &&
        updated.getUTCFullYear() === refYear &&
        updated.getUTCMonth() === refMonth
      ) {
        wonThisMonthAmount += amount;
        wonThisMonthCount++;
      }
    } else if (deal.stage === 'perdu') {
      lostDealsCount++;
    } else {
      openDealsCount++;
      totalPipelineAmount += amount;
      weightedRevenue += amount * (probability / 100);
    }
  }

  const closedDealsCount = wonDealsCount + lostDealsCount;
  const conversionRate =
    closedDealsCount > 0 ? Math.round((wonDealsCount / closedDealsCount) * 1000) / 10 : 0;
  const averageDealValue = Math.round((totalAllAmount / deals.length) * 100) / 100;

  return {
    totalPipelineAmount: Math.round(totalPipelineAmount * 100) / 100,
    weightedRevenue: Math.round(weightedRevenue * 100) / 100,
    conversionRate,
    averageDealValue,
    wonThisMonthAmount: Math.round(wonThisMonthAmount * 100) / 100,
    wonThisMonthCount,
    openDealsCount,
    wonDealsCount,
    lostDealsCount,
  };
}

/**
 * Groups and sorts deals by pipeline stage for Kanban rendering.
 * Deals inside each column are sorted by `updatedAt` descending, then `amount` descending.
 */
export function groupDealsByStage(deals: readonly Deal[]): KanbanColumn[] {
  const buckets = new Map<DealStage, Deal[]>();
  for (const stage of DEAL_STAGES) {
    buckets.set(stage.id, []);
  }

  for (const deal of deals) {
    const list = buckets.get(deal.stage);
    if (list) {
      list.push(deal);
    }
  }

  return DEAL_STAGES.map((stage) => {
    const stageDeals = (buckets.get(stage.id) ?? []).slice().sort((a, b) => {
      const timeDiff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (timeDiff !== 0 && !Number.isNaN(timeDiff)) {
        return timeDiff;
      }
      return b.amount - a.amount;
    });

    const totalAmount = stageDeals.reduce((sum, d) => sum + d.amount, 0);
    const weightedAmount = stageDeals.reduce(
      (sum, d) => sum + d.amount * (Math.min(100, Math.max(0, d.probability)) / 100),
      0
    );

    return {
      stage,
      deals: stageDeals,
      totalAmount: Math.round(totalAmount * 100) / 100,
      weightedAmount: Math.round(weightedAmount * 100) / 100,
    };
  });
}

/**
 * Multi-criteria instant filter for contacts and deals.
 */
export function filterContactsAndDeals(
  items: CrmFilterInput,
  searchQuery: string,
  ownerFilter: string | null = null,
  stageFilter: DealStage | 'all' | null = null
): CrmFilterResult {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const normalizedOwner = ownerFilter?.trim() || null;
  const normalizedStage = stageFilter && stageFilter !== 'all' ? stageFilter : null;

  const contactById = new Map<string, Contact>(
    items.contacts.map((contact) => [contact.id, contact])
  );

  const filteredContacts = items.contacts.filter((contact) => {
    if (normalizedOwner && contact.ownerId !== normalizedOwner) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    const haystack = [
      contact.firstName,
      contact.lastName,
      `${contact.firstName} ${contact.lastName}`,
      contact.email,
      contact.company,
      contact.phone,
      contact.status,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const filteredDeals = items.deals.filter((deal) => {
    if (normalizedStage && deal.stage !== normalizedStage) {
      return false;
    }

    const linkedContact = contactById.get(deal.contactId);
    const effectiveOwnerId = deal.ownerId ?? linkedContact?.ownerId ?? null;

    if (normalizedOwner && effectiveOwnerId !== normalizedOwner) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      deal.title,
      deal.company,
      deal.stage,
      deal.ownerName ?? '',
      linkedContact ? `${linkedContact.firstName} ${linkedContact.lastName}` : '',
      linkedContact?.email ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  return {
    contacts: filteredContacts,
    deals: filteredDeals,
  };
}

const STATUS_BASE_SCORE: Record<ContactStatus, number> = {
  lead: 15,
  qualified: 35,
  customer: 55,
  churned: 5,
};

const ACTIVITY_POINTS: Record<ActivityType, number> = {
  reunion: 18,
  appel: 12,
  email: 8,
  note: 5,
};

/**
 * Calculates a deterministic engagement lead score between 0 and 100
 * based on contact status, profile completeness, and recent activity weight.
 */
export function calculateLeadScore(
  contact: Contact,
  activities: readonly Activity[],
  referenceDate: Date = new Date()
): number {
  let score = STATUS_BASE_SCORE[contact.status] ?? 10;

  if (contact.email.trim().length > 0) score += 5;
  if (contact.phone.trim().length > 0) score += 5;
  if (contact.company.trim().length > 0) score += 5;

  const refMs = referenceDate.getTime();
  const msPerDay = 86_400_000;

  const contactActivities = activities.filter((a) => a.contactId === contact.id);

  for (const activity of contactActivities) {
    const basePoints = ACTIVITY_POINTS[activity.type] ?? 5;
    const actMs = new Date(activity.createdAt).getTime();
    let recencyMultiplier = 0.7;

    if (!Number.isNaN(actMs)) {
      const ageDays = Math.max(0, (refMs - actMs) / msPerDay);
      if (ageDays <= 14) {
        recencyMultiplier = 1.0;
      } else if (ageDays <= 30) {
        recencyMultiplier = 0.7;
      } else {
        recencyMultiplier = 0.4;
      }
    }

    score += basePoints * recencyMultiplier;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export interface LeadScoreMeta {
  label: 'Chaud' | 'Tiède' | 'Froid';
  barClass: string;
  badgeClass: string;
}

/**
 * Maps a numeric lead score (0-100) to its semantic heat label and Tailwind classes.
 */
export function getLeadScoreMeta(score: number): LeadScoreMeta {
  if (score >= 70) {
    return {
      label: 'Chaud',
      barClass: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
      badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    };
  }
  if (score >= 40) {
    return {
      label: 'Tiède',
      barClass: 'bg-gradient-to-r from-indigo-400 to-indigo-600',
      badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
    };
  }
  return {
    label: 'Froid',
    barClass: 'bg-gradient-to-r from-amber-400 to-orange-500',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  };
}

/**
 * Pure local forecast aggregator mirroring the `calculateMonthlyForecast` Cloud Function
 * (used as a fallback when running in offline/demo mode without Firebase Functions).
 */
export function buildMonthlyForecastLocal(
  deals: readonly Deal[],
  contacts: readonly Contact[],
  referenceDate: Date = new Date()
): MonthlyForecastReport {
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const repMap = new Map<string, RepForecast>();

  let totalPipelineAmount = 0;
  let totalWeightedForecast = 0;
  let totalWonAmount = 0;

  for (const deal of deals) {
    const ownerId = deal.ownerId ?? contactById.get(deal.contactId)?.ownerId ?? 'unassigned';
    const ownerName = deal.ownerName ?? (ownerId === 'unassigned' ? 'Non assigné' : ownerId);

    let rep = repMap.get(ownerId);
    if (!rep) {
      rep = {
        ownerId,
        ownerName,
        openDealsCount: 0,
        pipelineAmount: 0,
        weightedForecast: 0,
        wonAmount: 0,
      };
      repMap.set(ownerId, rep);
    }

    if (deal.stage === 'gagne') {
      rep.wonAmount += deal.amount;
      totalWonAmount += deal.amount;
    } else if (deal.stage !== 'perdu') {
      const weighted = deal.amount * (Math.min(100, Math.max(0, deal.probability)) / 100);
      rep.openDealsCount += 1;
      rep.pipelineAmount += deal.amount;
      rep.weightedForecast += weighted;
      totalPipelineAmount += deal.amount;
      totalWeightedForecast += weighted;
    }
  }

  const byRep = Array.from(repMap.values())
    .map((r) => ({
      ...r,
      pipelineAmount: Math.round(r.pipelineAmount * 100) / 100,
      weightedForecast: Math.round(r.weightedForecast * 100) / 100,
      wonAmount: Math.round(r.wonAmount * 100) / 100,
    }))
    .sort((a, b) => b.weightedForecast - a.weightedForecast);

  const month = `${referenceDate.getUTCFullYear()}-${String(
    referenceDate.getUTCMonth() + 1
  ).padStart(2, '0')}`;

  return {
    month,
    generatedAt: referenceDate.toISOString(),
    totalPipelineAmount: Math.round(totalPipelineAmount * 100) / 100,
    totalWeightedForecast: Math.round(totalWeightedForecast * 100) / 100,
    totalWonAmount: Math.round(totalWonAmount * 100) / 100,
    byRep,
  };
}
