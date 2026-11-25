import { Activity, Contact, Deal } from '../models/crm.model';
import {
  calculateLeadScore,
  computePipelineMetrics,
  filterContactsAndDeals,
  groupDealsByStage,
} from './crm-analytics.utils';

describe('crm-analytics.utils (pure business functions)', () => {
  const refDate = new Date('2026-11-25T12:00:00.000Z');

  const sampleContacts: Contact[] = [
    {
      id: 'c1',
      firstName: 'Claire',
      lastName: 'Moreau',
      email: 'claire.moreau@novatech.fr',
      phone: '+33 6 11 22 33 44',
      company: 'NovaTech SAS',
      status: 'qualified',
      ownerId: 'rep-alice',
      createdAt: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 'c2',
      firstName: 'Lucas',
      lastName: 'Bernard',
      email: 'l.bernard@helix.io',
      phone: '',
      company: 'Helix Cloud',
      status: 'lead',
      ownerId: 'rep-bob',
      createdAt: '2026-11-05T10:00:00.000Z',
    },
    {
      id: 'c3',
      firstName: 'Sofia',
      lastName: 'Keller',
      email: 'sofia@lumina.eu',
      phone: '+33 6 99 88 77 66',
      company: 'Lumina Retail',
      status: 'customer',
      ownerId: 'rep-alice',
      createdAt: '2026-09-12T10:00:00.000Z',
    },
  ];

  const sampleDeals: Deal[] = [
    {
      id: 'd1',
      title: 'Déploiement Enterprise NovaTech',
      contactId: 'c1',
      company: 'NovaTech SAS',
      amount: 40000,
      probability: 50,
      stage: 'proposition',
      expectedCloseDate: '2026-12-15',
      updatedAt: '2026-11-20T09:00:00.000Z',
      ownerId: 'rep-alice',
    },
    {
      id: 'd2',
      title: 'Pack Starter Helix',
      contactId: 'c2',
      company: 'Helix Cloud',
      amount: 10000,
      probability: 20,
      stage: 'prospection',
      expectedCloseDate: '2027-01-10',
      updatedAt: '2026-11-22T15:00:00.000Z',
      ownerId: 'rep-bob',
    },
    {
      id: 'd3',
      title: 'Renouvellement Lumina',
      contactId: 'c3',
      company: 'Lumina Retail',
      amount: 30000,
      probability: 100,
      stage: 'gagne',
      expectedCloseDate: '2026-11-18',
      updatedAt: '2026-11-18T11:00:00.000Z',
      ownerId: 'rep-alice',
    },
    {
      id: 'd4',
      title: 'Audit Sécurité Annulé',
      contactId: 'c2',
      company: 'Helix Cloud',
      amount: 20000,
      probability: 0,
      stage: 'perdu',
      expectedCloseDate: '2026-11-10',
      updatedAt: '2026-11-10T11:00:00.000Z',
      ownerId: 'rep-bob',
    },
  ];

  const sampleActivities: Activity[] = [
    {
      id: 'a1',
      dealId: 'd1',
      contactId: 'c1',
      type: 'reunion',
      summary: 'Démo technique avec le CTO',
      createdAt: '2026-11-20T10:00:00.000Z', // 5 days ago -> x1.0 (+18)
      authorName: 'Alice Martin',
    },
    {
      id: 'a2',
      dealId: 'd1',
      contactId: 'c1',
      type: 'appel',
      summary: 'Suivi budget Q4',
      createdAt: '2026-11-01T10:00:00.000Z', // 24 days ago -> x0.7 (+8.4)
      authorName: 'Alice Martin',
    },
    {
      id: 'a3',
      dealId: null,
      contactId: 'c2',
      type: 'email',
      summary: 'Premier contact',
      createdAt: '2026-09-01T10:00:00.000Z', // >30 days ago -> x0.4 (+3.2)
      authorName: 'Bob Dupont',
    },
  ];

  describe('computePipelineMetrics', () => {
    it('returns zeros for an empty deals list', () => {
      const metrics = computePipelineMetrics([], refDate);
      expect(metrics.totalPipelineAmount).toBe(0);
      expect(metrics.weightedRevenue).toBe(0);
      expect(metrics.conversionRate).toBe(0);
      expect(metrics.averageDealValue).toBe(0);
      expect(metrics.wonThisMonthAmount).toBe(0);
    });

    it('calculates total open pipeline, weighted revenue, conversion rate, average deal value, and won this month', () => {
      const metrics = computePipelineMetrics(sampleDeals, refDate);
      // Open deals: d1 (40000 * 0.5 = 20000) + d2 (10000 * 0.2 = 2000)
      expect(metrics.totalPipelineAmount).toBe(50000);
      expect(metrics.weightedRevenue).toBe(22000);
      // Closed: 1 won, 1 lost => 50%
      expect(metrics.conversionRate).toBe(50);
      // Average across all 4 deals: (40000 + 10000 + 30000 + 20000) / 4 = 25000
      expect(metrics.averageDealValue).toBe(25000);
      // Won in Nov 2026: d3 (30000)
      expect(metrics.wonThisMonthAmount).toBe(30000);
      expect(metrics.wonThisMonthCount).toBe(1);
      expect(metrics.openDealsCount).toBe(2);
    });
  });

  describe('groupDealsByStage', () => {
    it('returns all 6 ordered stages with deals and financial totals', () => {
      const columns = groupDealsByStage(sampleDeals);
      expect(columns.length).toBe(6);
      expect(columns.map((c) => c.stage.id)).toEqual([
        'prospection',
        'qualification',
        'proposition',
        'negociation',
        'gagne',
        'perdu',
      ]);

      const propositionCol = columns.find((c) => c.stage.id === 'proposition');
      expect(propositionCol?.deals.length).toBe(1);
      expect(propositionCol?.totalAmount).toBe(40000);
      expect(propositionCol?.weightedAmount).toBe(20000);
    });
  });

  describe('filterContactsAndDeals', () => {
    it('filters by search query across contact and deal fields', () => {
      const result = filterContactsAndDeals(
        { contacts: sampleContacts, deals: sampleDeals },
        'novatech'
      );
      expect(result.contacts.map((c) => c.id)).toEqual(['c1']);
      expect(result.deals.map((d) => d.id)).toEqual(['d1']);
    });

    it('filters by owner and stage simultaneously', () => {
      const result = filterContactsAndDeals(
        { contacts: sampleContacts, deals: sampleDeals },
        '',
        'rep-alice',
        'gagne'
      );
      expect(result.contacts.map((c) => c.id)).toEqual(['c1', 'c3']);
      expect(result.deals.map((d) => d.id)).toEqual(['d3']);
    });
  });

  describe('calculateLeadScore', () => {
    it('computes engagement score with status, completeness, and recency-weighted activities', () => {
      // c1: qualified (35) + email (5) + phone (5) + company (5) = 50
      // + a1 reunion recent (18 * 1.0 = 18) + a2 appel 24d (12 * 0.7 = 8.4) => 76.4 -> 76
      expect(calculateLeadScore(sampleContacts[0], sampleActivities, refDate)).toBe(76);

      // c2: lead (15) + email (5) + company (5) = 25 (no phone)
      // + a3 email >30d (8 * 0.4 = 3.2) => 28.2 -> 28
      expect(calculateLeadScore(sampleContacts[1], sampleActivities, refDate)).toBe(28);
    });

    it('clamps score between 0 and 100', () => {
      const manyMeetings: Activity[] = Array.from({ length: 10 }, (_, idx) => ({
        id: `m-${idx}`,
        dealId: null,
        contactId: 'c3',
        type: 'reunion',
        summary: 'Atelier stratégique',
        createdAt: '2026-11-24T10:00:00.000Z',
        authorName: 'Alice Martin',
      }));
      expect(calculateLeadScore(sampleContacts[2], manyMeetings, refDate)).toBe(100);
    });
  });
});
