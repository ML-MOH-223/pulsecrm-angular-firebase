import { TestBed } from '@angular/core/testing';
import { AuthStore } from '../auth/auth.store';
import { FirebaseService } from '../firebase/firebase.service';
import { CRM_STORE, CrmStore } from './crm.store';

describe('CRM_STORE (critical CRM state & transition flows)', () => {
  let store: CrmStore;

  const mockFirebaseService = {
    isConfigured: false,
    app: null,
    auth: null,
    db: null,
    functions: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    });
    store = TestBed.inject(CRM_STORE);
    TestBed.flushEffects();
  });

  it('loads deterministic seed data in demo mode', () => {
    expect(store.syncMode()).toBe('demo');
    expect(store.loading()).toBeFalse();
    expect(store.contacts().length).toBeGreaterThan(0);
    expect(store.deals().length).toBeGreaterThan(0);
    expect(store.activities().length).toBeGreaterThan(0);
  });

  it('creates, updates, selects, and deletes a contact safely', async () => {
    const initialCount = store.contacts().length;
    const id = await store.addContact({
      firstName: 'Nadia',
      lastName: 'Diallo',
      email: 'nadia.diallo@acme.sn',
      phone: '+221 77 000 00 00',
      company: 'Acme Dakar',
      status: 'lead',
      ownerId: 'demo-user',
    });

    expect(id).toBeTruthy();
    expect(store.contacts().length).toBe(initialCount + 1);

    store.selectContact(id);
    expect(store.selectedContact()?.email).toBe('nadia.diallo@acme.sn');

    await store.updateContact(id!, { status: 'qualified', company: 'Acme West Africa' });
    expect(store.selectedContact()?.status).toBe('qualified');
    expect(store.selectedContact()?.company).toBe('Acme West Africa');

    await store.deleteContact(id!);
    expect(store.contacts().length).toBe(initialCount);
    expect(store.selectedContactId()).toBeNull();
  });

  it('adds and deletes a deal and computes updated pipeline metrics', async () => {
    const initialCount = store.deals().length;
    const dealId = await store.addDeal({
      title: 'Contrat Annuel Cloud',
      contactId: store.contacts()[0].id,
      company: 'Test Corp',
      amount: 50000,
      probability: 60,
      stage: 'proposition',
      expectedCloseDate: '2026-12-31',
      ownerId: 'demo-user',
      ownerName: 'Camille Laurent',
    });

    expect(dealId).toBeTruthy();
    expect(store.deals().length).toBe(initialCount + 1);

    await store.deleteDeal(dealId!);
    expect(store.deals().length).toBe(initialCount);
  });

  it('promotes linked contact to customer and logs automation activity when moving a deal to gagne', async () => {
    const contactId = await store.addContact({
      firstName: 'Omar',
      lastName: 'Sylla',
      email: 'omar@kora.io',
      phone: '',
      company: 'Kora Tech',
      status: 'qualified',
      ownerId: 'demo-user',
    });

    const dealId = await store.addDeal({
      title: 'Licence Entreprise Kora',
      contactId: contactId!,
      company: 'Kora Tech',
      amount: 25000,
      probability: 60,
      stage: 'negociation',
      expectedCloseDate: '2026-12-20',
      ownerId: 'demo-user',
    });

    const activitiesBefore = store.activities().length;
    await store.moveDealStage(dealId!, 'gagne');

    const movedDeal = store.deals().find((d) => d.id === dealId);
    const promotedContact = store.contacts().find((c) => c.id === contactId);

    expect(movedDeal?.stage).toBe('gagne');
    expect(movedDeal?.probability).toBe(100);
    expect(promotedContact?.status).toBe('customer');
    expect(store.activities().length).toBe(activitiesBefore + 1);
    expect(store.activities()[0].authorName).toBe('PulseCRM Automation');
  });

  it('sets probability to 0 when moving a deal to perdu and ignores invalid or same-stage moves', async () => {
    const openDeal = store.deals().find((d) => d.stage !== 'gagne' && d.stage !== 'perdu')!;
    const originalUpdatedAt = openDeal.updatedAt;

    await store.moveDealStage('non-existent-id', 'perdu');
    await store.moveDealStage(openDeal.id, openDeal.stage);
    expect(store.deals().find((d) => d.id === openDeal.id)?.updatedAt).toBe(originalUpdatedAt);

    await store.moveDealStage(openDeal.id, 'perdu');
    const lostDeal = store.deals().find((d) => d.id === openDeal.id);
    expect(lostDeal?.stage).toBe('perdu');
    expect(lostDeal?.probability).toBe(0);
  });

  it('adds an activity and exposes it on selectedContactActivities', async () => {
    const contactId = store.contacts()[0].id;
    store.selectContact(contactId);
    const before = store.selectedContactActivities().length;

    const actId = await store.addActivity({
      contactId,
      dealId: null,
      type: 'appel',
      summary: 'Validation budget Q1',
      authorName: 'Camille Laurent',
    });

    expect(actId).toBeTruthy();
    expect(store.selectedContactActivities().length).toBe(before + 1);
  });

  it('generates a local monthly forecast report deterministically', async () => {
    const report = await store.requestMonthlyForecast();
    expect(report).not.toBeNull();
    expect(report?.month).toMatch(/^\d{4}-\d{2}$/);
    expect(report?.byRep.length).toBeGreaterThan(0);
    expect(store.forecastReport()).toEqual(report);
    expect(store.forecastLoading()).toBeFalse();
  });

  it('filters contacts and deals reactively by search query, stage, and owner', () => {
    const firstContact = store.contacts()[0];
    store.setSearchQuery(firstContact.company);
    expect(store.filteredContacts().some((c) => c.id === firstContact.id)).toBeTrue();

    store.setSearchQuery('');
    store.setSelectedStage('gagne');
    expect(store.filteredDeals().every((d) => d.stage === 'gagne')).toBeTrue();

    store.setSelectedStage('all');
    store.setOwnerFilter('unknown-owner-id');
    expect(store.filteredContacts().length).toBe(0);
    expect(store.filteredDeals().length).toBe(0);
  });

  it('safely no-ops seedDemoDataToFirestore when Firestore is unconfigured', async () => {
    await store.seedDemoDataToFirestore();
    expect(store.error()).toBeNull();
  });
});
