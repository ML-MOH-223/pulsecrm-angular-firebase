import { InjectionToken, computed, effect, inject, signal } from '@angular/core';
import {
  Timestamp,
  Unsubscribe,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { AuthStore } from '../auth/auth.store';
import { FirebaseService } from '../firebase/firebase.service';
import {
  Activity,
  Contact,
  DEAL_STAGES,
  Deal,
  DealStage,
  MonthlyForecastReport,
  NewActivityPayload,
  NewContactPayload,
  NewDealPayload,
} from '../models/crm.model';
import {
  buildMonthlyForecastLocal,
  calculateLeadScore,
  computePipelineMetrics,
  filterContactsAndDeals,
  groupDealsByStage,
} from '../utils/crm-analytics.utils';
import { SEED_ACTIVITIES, SEED_CONTACTS, SEED_DEALS } from './crm-seed.data';

function toIsoString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function generateLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Functional Signal-based reactive store factory for PulseCRM.
 * Must be invoked inside an Angular injection context (e.g. InjectionToken factory or component constructor).
 */
export function useCrmStore() {
  const firebase = inject(FirebaseService);
  const authStore = inject(AuthStore);

  // Core state signals
  const _contacts = signal<Contact[]>([]);
  const _deals = signal<Deal[]>([]);
  const _activities = signal<Activity[]>([]);
  const _selectedStage = signal<DealStage | 'all'>('all');
  const _searchQuery = signal<string>('');
  const _ownerFilter = signal<string | null>(null);
  const _selectedContactId = signal<string | null>(null);
  const _loading = signal<boolean>(true);
  const _error = signal<string | null>(null);
  const _syncMode = signal<'firestore' | 'demo'>(
    firebase.isConfigured ? 'firestore' : 'demo'
  );
  const _forecastReport = signal<MonthlyForecastReport | null>(null);
  const _forecastLoading = signal<boolean>(false);

  // Real-time Firestore sync driven reactively by AuthStore user signal
  effect((onCleanup) => {
    const user = authStore.user();

    if (!firebase.isConfigured || !firebase.db) {
      _syncMode.set('demo');
      if (_contacts().length === 0 && _deals().length === 0) {
        _contacts.set(structuredClone(SEED_CONTACTS));
        _deals.set(structuredClone(SEED_DEALS));
        _activities.set(structuredClone(SEED_ACTIVITIES));
      }
      _loading.set(false);
      return;
    }

    if (!user) {
      _contacts.set([]);
      _deals.set([]);
      _activities.set([]);
      _loading.set(false);
      return;
    }

    _syncMode.set('firestore');
    _loading.set(true);
    _error.set(null);

    const db = firebase.db;
    let contactsReady = false;
    let dealsReady = false;
    let activitiesReady = false;

    const markReady = () => {
      if (contactsReady && dealsReady && activitiesReady) {
        _loading.set(false);
      }
    };

    const unsubs: Unsubscribe[] = [];

    const contactsQuery = query(
      collection(db, 'contacts'),
      orderBy('createdAt', 'desc')
    );
    unsubs.push(
      onSnapshot(
        contactsQuery,
        (snap) => {
          _contacts.set(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                firstName: String(data['firstName'] ?? ''),
                lastName: String(data['lastName'] ?? ''),
                email: String(data['email'] ?? ''),
                phone: String(data['phone'] ?? ''),
                company: String(data['company'] ?? ''),
                status: (data['status'] ?? 'lead') as Contact['status'],
                ownerId: String(data['ownerId'] ?? ''),
                createdAt: toIsoString(data['createdAt']),
              };
            })
          );
          contactsReady = true;
          markReady();
        },
        (err) => {
          _error.set(`Erreur Firestore (contacts): ${err.message}`);
          _loading.set(false);
        }
      )
    );

    const dealsQuery = query(
      collection(db, 'deals'),
      orderBy('updatedAt', 'desc')
    );
    unsubs.push(
      onSnapshot(
        dealsQuery,
        (snap) => {
          _deals.set(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                title: String(data['title'] ?? ''),
                contactId: String(data['contactId'] ?? ''),
                company: String(data['company'] ?? ''),
                amount: Number(data['amount'] ?? 0),
                probability: Number(data['probability'] ?? 0),
                stage: (data['stage'] ?? 'prospection') as DealStage,
                expectedCloseDate: String(data['expectedCloseDate'] ?? ''),
                updatedAt: toIsoString(data['updatedAt']),
                ownerId: data['ownerId'] ? String(data['ownerId']) : undefined,
                ownerName: data['ownerName'] ? String(data['ownerName']) : undefined,
              };
            })
          );
          dealsReady = true;
          markReady();
        },
        (err) => {
          _error.set(`Erreur Firestore (deals): ${err.message}`);
          _loading.set(false);
        }
      )
    );

    const activitiesQuery = query(
      collection(db, 'activities'),
      orderBy('createdAt', 'desc')
    );
    unsubs.push(
      onSnapshot(
        activitiesQuery,
        (snap) => {
          _activities.set(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                dealId: data['dealId'] ? String(data['dealId']) : null,
                contactId: String(data['contactId'] ?? ''),
                type: (data['type'] ?? 'note') as Activity['type'],
                summary: String(data['summary'] ?? ''),
                createdAt: toIsoString(data['createdAt']),
                authorName: String(data['authorName'] ?? 'Équipe'),
              };
            })
          );
          activitiesReady = true;
          markReady();
        },
        (err) => {
          _error.set(`Erreur Firestore (activities): ${err.message}`);
          _loading.set(false);
        }
      )
    );

    onCleanup(() => {
      for (const unsub of unsubs) {
        unsub();
      }
    });
  });

  // Derived computed signals
  const filteredResult = computed(() =>
    filterContactsAndDeals(
      { contacts: _contacts(), deals: _deals() },
      _searchQuery(),
      _ownerFilter(),
      _selectedStage()
    )
  );

  const filteredContacts = computed(() => filteredResult().contacts);
  const filteredDeals = computed(() => filteredResult().deals);

  const pipelineMetrics = computed(() => computePipelineMetrics(filteredDeals()));

  const kanbanColumns = computed(() => groupDealsByStage(filteredDeals()));

  const leadScores = computed(() => {
    const scores = new Map<string, number>();
    const allActivities = _activities();
    for (const contact of _contacts()) {
      scores.set(contact.id, calculateLeadScore(contact, allActivities));
    }
    return scores;
  });

  const selectedContact = computed(
    () => _contacts().find((c) => c.id === _selectedContactId()) ?? null
  );

  const selectedContactDeals = computed(() => {
    const id = _selectedContactId();
    if (!id) return [];
    return _deals().filter((d) => d.contactId === id);
  });

  const selectedContactActivities = computed(() => {
    const id = _selectedContactId();
    if (!id) return [];
    return _activities()
      .filter((a) => a.contactId === id)
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  });

  const ownerOptions = computed(() => {
    const map = new Map<string, string>();
    for (const deal of _deals()) {
      if (deal.ownerId) {
        map.set(deal.ownerId, deal.ownerName || deal.ownerId);
      }
    }
    for (const contact of _contacts()) {
      if (contact.ownerId && !map.has(contact.ownerId)) {
        map.set(
          contact.ownerId,
          contact.ownerId === authStore.user()?.uid
            ? authStore.user()!.displayName
            : contact.ownerId
        );
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  });

  // Filter setters
  const setSearchQuery = (queryStr: string) => _searchQuery.set(queryStr);
  const setSelectedStage = (stage: DealStage | 'all') => _selectedStage.set(stage);
  const setOwnerFilter = (ownerId: string | null) => _ownerFilter.set(ownerId);
  const selectContact = (contactId: string | null) => _selectedContactId.set(contactId);
  const clearError = () => _error.set(null);

  // CRUD actions
  const addContact = async (payload: NewContactPayload): Promise<string | null> => {
    const now = new Date().toISOString();
    const ownerId = payload.ownerId || authStore.user()?.uid || 'demo-user';
    const record = { ...payload, ownerId, createdAt: now };

    if (_syncMode() === 'demo' || !firebase.db) {
      const id = generateLocalId('contact');
      _contacts.update((list) => [{ id, ...record }, ...list]);
      return id;
    }

    try {
      const ref = await addDoc(collection(firebase.db, 'contacts'), record);
      return ref.id;
    } catch (err) {
      _error.set(
        `Impossible de créer le contact: ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }
  };

  const updateContact = async (
    contactId: string,
    patch: Partial<Omit<Contact, 'id' | 'createdAt'>>
  ): Promise<void> => {
    if (_syncMode() === 'demo' || !firebase.db) {
      _contacts.update((list) =>
        list.map((c) => (c.id === contactId ? { ...c, ...patch } : c))
      );
      return;
    }

    try {
      await updateDoc(doc(firebase.db, 'contacts', contactId), patch);
    } catch (err) {
      _error.set(
        `Impossible de mettre à jour le contact: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const deleteContact = async (contactId: string): Promise<void> => {
    if (_selectedContactId() === contactId) {
      _selectedContactId.set(null);
    }

    if (_syncMode() === 'demo' || !firebase.db) {
      _contacts.update((list) => list.filter((c) => c.id !== contactId));
      return;
    }

    try {
      await deleteDoc(doc(firebase.db, 'contacts', contactId));
    } catch (err) {
      _error.set(
        `Impossible de supprimer le contact: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const addDeal = async (payload: NewDealPayload): Promise<string | null> => {
    const now = new Date().toISOString();
    const currentUser = authStore.user();
    const record = {
      ...payload,
      ownerId: payload.ownerId || currentUser?.uid || 'demo-user',
      ownerName: payload.ownerName || currentUser?.displayName || 'Commercial',
      updatedAt: now,
    };

    if (_syncMode() === 'demo' || !firebase.db) {
      const id = generateLocalId('deal');
      _deals.update((list) => [{ id, ...record }, ...list]);
      return id;
    }

    try {
      const ref = await addDoc(collection(firebase.db, 'deals'), record);
      return ref.id;
    } catch (err) {
      _error.set(
        `Impossible de créer l’opportunité: ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }
  };

  const moveDealStage = async (
    dealId: string,
    nextStage: DealStage
  ): Promise<void> => {
    const existing = _deals().find((d) => d.id === dealId);
    if (!existing || existing.stage === nextStage) return;

    const stageMeta = DEAL_STAGES.find((s) => s.id === nextStage);
    const nextProbability =
      nextStage === 'gagne'
        ? 100
        : nextStage === 'perdu'
          ? 0
          : stageMeta?.defaultProbability ?? existing.probability;
    const now = new Date().toISOString();

    if (_syncMode() === 'demo' || !firebase.db) {
      _deals.update((list) =>
        list.map((d) =>
          d.id === dealId
            ? { ...d, stage: nextStage, probability: nextProbability, updatedAt: now }
            : d
        )
      );

      // Mirror the `onDealWon` Cloud Function behavior in local demo mode
      if (nextStage === 'gagne' && existing.stage !== 'gagne') {
        if (existing.contactId) {
          _contacts.update((list) =>
            list.map((c) =>
              c.id === existing.contactId ? { ...c, status: 'customer' } : c
            )
          );
        }
        _activities.update((list) => [
          {
            id: generateLocalId('act'),
            dealId: existing.id,
            contactId: existing.contactId,
            type: 'note',
            summary: `Automatisation onDealWon : "${existing.title}" (${existing.amount.toLocaleString('fr-FR')} €) gagné — statut client activé.`,
            createdAt: now,
            authorName: 'PulseCRM Automation',
          },
          ...list,
        ]);
      }
      return;
    }

    try {
      await updateDoc(doc(firebase.db, 'deals', dealId), {
        stage: nextStage,
        probability: nextProbability,
        updatedAt: now,
      });
    } catch (err) {
      _error.set(
        `Impossible de déplacer l’opportunité: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const deleteDeal = async (dealId: string): Promise<void> => {
    if (_syncMode() === 'demo' || !firebase.db) {
      _deals.update((list) => list.filter((d) => d.id !== dealId));
      return;
    }

    try {
      await deleteDoc(doc(firebase.db, 'deals', dealId));
    } catch (err) {
      _error.set(
        `Impossible de supprimer l’opportunité: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const addActivity = async (payload: NewActivityPayload): Promise<string | null> => {
    const now = new Date().toISOString();
    const record = {
      ...payload,
      authorName: payload.authorName || authStore.user()?.displayName || 'Commercial',
      createdAt: now,
    };

    if (_syncMode() === 'demo' || !firebase.db) {
      const id = generateLocalId('act');
      _activities.update((list) => [{ id, ...record }, ...list]);
      return id;
    }

    try {
      const ref = await addDoc(collection(firebase.db, 'activities'), record);
      return ref.id;
    } catch (err) {
      _error.set(
        `Impossible d’ajouter l’activité: ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }
  };

  const requestMonthlyForecast = async (): Promise<MonthlyForecastReport | null> => {
    _forecastLoading.set(true);
    _error.set(null);
    try {
      if (_syncMode() === 'firestore' && firebase.functions) {
        const callable = httpsCallable<void, MonthlyForecastReport>(
          firebase.functions,
          'calculateMonthlyForecast'
        );
        const result = await callable();
        _forecastReport.set(result.data);
        return result.data;
      }

      // Demo / offline fallback using the pure local aggregator
      const localReport = buildMonthlyForecastLocal(_deals(), _contacts());
      _forecastReport.set(localReport);
      return localReport;
    } catch (err) {
      // Graceful fallback to local computation if Cloud Function isn't deployed yet
      const fallback = buildMonthlyForecastLocal(_deals(), _contacts());
      _forecastReport.set(fallback);
      _error.set(
        `Cloud Function indisponible (${err instanceof Error ? err.message : 'offline'}) — prévision calculée localement.`
      );
      return fallback;
    } finally {
      _forecastLoading.set(false);
    }
  };

  const seedDemoDataToFirestore = async (): Promise<void> => {
    if (!firebase.db) return;
    const batch = writeBatch(firebase.db);
    const uid = authStore.user()?.uid || 'demo-user';
    const author = authStore.user()?.displayName || 'Commercial';

    for (const c of SEED_CONTACTS) {
      const { id, ...rest } = c;
      batch.set(doc(firebase.db, 'contacts', id), { ...rest, ownerId: uid });
    }
    for (const d of SEED_DEALS) {
      const { id, ...rest } = d;
      batch.set(doc(firebase.db, 'deals', id), {
        ...rest,
        ownerId: uid,
        ownerName: author,
      });
    }
    for (const a of SEED_ACTIVITIES) {
      const { id, ...rest } = a;
      batch.set(doc(firebase.db, 'activities', id), rest);
    }
    await batch.commit();
  };

  return {
    // Readonly state signals
    contacts: _contacts.asReadonly(),
    deals: _deals.asReadonly(),
    activities: _activities.asReadonly(),
    selectedStage: _selectedStage.asReadonly(),
    searchQuery: _searchQuery.asReadonly(),
    ownerFilter: _ownerFilter.asReadonly(),
    selectedContactId: _selectedContactId.asReadonly(),
    loading: _loading.asReadonly(),
    error: _error.asReadonly(),
    syncMode: _syncMode.asReadonly(),
    forecastReport: _forecastReport.asReadonly(),
    forecastLoading: _forecastLoading.asReadonly(),

    // Derived computed signals
    filteredContacts,
    filteredDeals,
    pipelineMetrics,
    kanbanColumns,
    leadScores,
    selectedContact,
    selectedContactDeals,
    selectedContactActivities,
    ownerOptions,

    // UI filter & selection actions
    setSearchQuery,
    setSelectedStage,
    setOwnerFilter,
    selectContact,
    clearError,

    // CRUD & Cloud Function actions
    addContact,
    updateContact,
    deleteContact,
    addDeal,
    moveDealStage,
    deleteDeal,
    addActivity,
    requestMonthlyForecast,
    seedDemoDataToFirestore,
  };
}

export type CrmStore = ReturnType<typeof useCrmStore>;

export const CRM_STORE = new InjectionToken<CrmStore>('CRM_STORE', {
  providedIn: 'root',
  factory: () => useCrmStore(),
});
