import { mapActivityDoc, mapContactDoc, mapDealDoc, toIsoString } from './crm.repository';

describe('crm.repository mappers (non-regression)', () => {
  it('normalizes ISO strings, Timestamp-like objects, and invalid values via toIsoString', () => {
    expect(toIsoString('2026-11-26T10:00:00.000Z')).toBe('2026-11-26T10:00:00.000Z');
    expect(toIsoString({ toDate: () => new Date('2026-11-26T12:00:00.000Z') })).toBe(
      '2026-11-26T12:00:00.000Z'
    );
    expect(toIsoString(null)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('safely maps partial/missing Firestore contact documents with defaults', () => {
    const contact = mapContactDoc('c-99', { firstName: 'Awa', email: 'awa@demo.sn' });
    expect(contact.id).toBe('c-99');
    expect(contact.firstName).toBe('Awa');
    expect(contact.lastName).toBe('');
    expect(contact.status).toBe('lead');
    expect(contact.ownerId).toBe('');
  });

  it('safely maps partial/missing Firestore deal documents with numeric defaults', () => {
    const deal = mapDealDoc('d-99', { title: 'Projet Atlas', amount: 12000, ownerId: 'uid-1' });
    expect(deal.id).toBe('d-99');
    expect(deal.amount).toBe(12000);
    expect(deal.probability).toBe(0);
    expect(deal.stage).toBe('prospection');
    expect(deal.ownerId).toBe('uid-1');
  });

  it('safely maps partial/missing Firestore activity documents', () => {
    const activity = mapActivityDoc('a-99', { contactId: 'c-1', summary: 'Note interne' });
    expect(activity.id).toBe('a-99');
    expect(activity.dealId).toBeNull();
    expect(activity.type).toBe('note');
    expect(activity.authorName).toBe('Équipe');
  });
});
