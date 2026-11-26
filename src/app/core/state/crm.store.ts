import { InjectionToken, computed, effect, inject, signal } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { normalizeError } from '../errors/app-error';
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
import { logger } from '../observability/logger';
import { createRequestId } from '../observability/request-id';
import {
  createActivityRecord,
  createContactRecord,
  createDealRecord,
  deleteContactRecord,
  deleteDealRecord,
  fetchCloudMonthlyForecast,
  seedOwnerDemoBatch,
  subscribeOwnerCollections,
  updateContactRecord,
  updateDealStageRecord,
} from '../repositories/crm.repository';
import {
  NewActivityPayloadSchema,
  NewContactPayloadSchema,
  NewDealPayloadSchema,
  parseWithSchema,
} from '../schemas/crm.schemas';
import {
  buildMonthlyForecastLocal,
  calculateLeadScore,
  computePipelineMetrics,
  filterContactsAndDeals,
  groupDealsByStage,
} from '../utils/crm-analytics.utils';
import { SEED_ACTIVITIES, SEED_CONTACTS, SEED_DEALS } from './crm-seed.data';

function generateLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function resolveNextProbability(nextStage: DealStage, fallback: number): number {
  if (nextStage === 'gagne') return 100;
  if (nextStage === 'perdu') return 0;
  return DEAL_STAGES.find((s) => s.id === nextStage)?.defaultProbability ?? fallback;
}

/**
 * Functional Signal-based reactive store factory for PulseCRM.
 * Delegates all Firestore/Functions I/O to `crm.repository.ts`.
 */
export function useCrmStore() {
  const firebase = inject(FirebaseService);
  const authStore = inject(AuthStore);

  const _contacts = signal<Contact[]>([]);
  const _deals = signal<Deal[]>([]);
  const _activities = signal<Activity[]>([]);
  const _selectedStage = signal<DealStage | 'all'>('all');
  const _searchQuery = signal<string>('');
  const _ownerFilter = signal<string | null>(null);
  const _selectedContactId = signal<string | null>(null);
  const _loading = signal<boolean>(true);
  const _error = signal<string | null>(null);
  const _syncMode = signal<'firestore' | 'demo'>(firebase.isConfigured ? 'firestore' : 'demo');
  const _forecastReport = signal<MonthlyForecastReport | null>(null);
  const _forecastLoading = signal<boolean>(false);
  const _saving = signal<boolean>(false);
  const _toast = signal<{ type: 'success' | 'info'; message: string } | null>(null);

  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    if (toastTimer) clearTimeout(toastTimer);
    _toast.set({ type, message });
    toastTimer = setTimeout(() => _toast.set(null), 3500);
  };
  const clearToast = () => {
    if (toastTimer) clearTimeout(toastTimer);
    _toast.set(null);
  };

  const reportFailure = (
    action: string,
    err: unknown,
    requestId: string,
    userMessage: string,
    extra: Record<string, unknown> = {}
  ) => {
    const appErr = normalizeError(err, {
      code: 'DATABASE_ERROR',
      userMessage,
      requestId,
      context: { action, ...extra },
    });
    logger.error(`CrmStore.${action} failed`, { module: 'CrmStore', requestId }, appErr);
    _error.set(`${appErr.userMessage} (réf. ${requestId})`);
  };

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

    const ready = { contacts: false, deals: false, activities: false };
    const markReady = () => {
      if (ready.contacts && ready.deals && ready.activities) _loading.set(false);
    };

    const unsubscribe = subscribeOwnerCollections(firebase.db, user.uid, {
      onContacts: (items) => {
        _contacts.set(items);
        ready.contacts = true;
        markReady();
      },
      onDeals: (items) => {
        _deals.set(items);
        ready.deals = true;
        markReady();
      },
      onActivities: (items) => {
        _activities.set(items);
        ready.activities = true;
        markReady();
      },
      onError: (col, err) => {
        const requestId = createRequestId('sync');
        const appErr = normalizeError(err, {
          code: 'FIRESTORE_LISTENER_ERROR',
          userMessage: `Erreur Firestore (${col}) : vérifiez votre connexion.`,
          requestId,
          context: { collection: col },
        });
        logger.error('Firestore listener error', { module: 'CrmStore', requestId, col }, appErr);
        _error.set(`${appErr.userMessage} (réf. ${requestId})`);
        _loading.set(false);
      },
    });

    onCleanup(() => unsubscribe());
  });

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
    return id ? _deals().filter((d) => d.contactId === id) : [];
  });
  const selectedContactActivities = computed(() => {
    const id = _selectedContactId();
    if (!id) return [];
    return _activities()
      .filter((a) => a.contactId === id)
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });
  const ownerOptions = computed(() => {
    const map = new Map<string, string>();
    for (const deal of _deals()) {
      if (deal.ownerId) map.set(deal.ownerId, deal.ownerName || deal.ownerId);
    }
    for (const contact of _contacts()) {
      if (contact.ownerId && !map.has(contact.ownerId)) {
        const label =
          contact.ownerId === authStore.user()?.uid
            ? authStore.user()!.displayName
            : contact.ownerId;
        map.set(contact.ownerId, label);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  });

  const addContact = async (payload: NewContactPayload): Promise<string | null> => {
    const requestId = createRequestId('contact');
    let validated: NewContactPayload;
    try {
      validated = parseWithSchema(NewContactPayloadSchema, payload, requestId, 'Contact');
    } catch (err) {
      reportFailure('addContact.validate', err, requestId, 'Données contact invalides.');
      return null;
    }

    const record = {
      ...validated,
      ownerId: validated.ownerId || authStore.user()?.uid || 'demo-user',
      createdAt: new Date().toISOString(),
    };
    if (_syncMode() === 'demo' || !firebase.db) {
      const id = generateLocalId('contact');
      _contacts.update((list) => [{ id, ...record }, ...list]);
      showToast(`Contact ${validated.firstName} ${validated.lastName} ajouté.`);
      return id;
    }

    _saving.set(true);
    try {
      const id = await createContactRecord(firebase.db, record);
      logger.info('Contact created', { module: 'CrmStore', requestId, contactId: id });
      showToast(`Contact ${validated.firstName} ${validated.lastName} ajouté.`);
      return id;
    } catch (err) {
      reportFailure('addContact', err, requestId, 'Impossible de créer le contact pour le moment.');
      return null;
    } finally {
      _saving.set(false);
    }
  };

  const updateContact = async (
    contactId: string,
    patch: Partial<Omit<Contact, 'id' | 'createdAt'>>
  ): Promise<void> => {
    if (_syncMode() === 'demo' || !firebase.db) {
      _contacts.update((list) => list.map((c) => (c.id === contactId ? { ...c, ...patch } : c)));
      showToast('Fiche contact mise à jour.');
      return;
    }

    _saving.set(true);
    const requestId = createRequestId('contact');
    try {
      await updateContactRecord(firebase.db, contactId, patch);
      logger.info('Contact updated', { module: 'CrmStore', requestId, contactId });
      showToast('Fiche contact mise à jour.');
    } catch (err) {
      reportFailure('updateContact', err, requestId, 'Impossible de mettre à jour ce contact.', {
        contactId,
      });
    } finally {
      _saving.set(false);
    }
  };

  const deleteContact = async (contactId: string): Promise<void> => {
    if (_selectedContactId() === contactId) _selectedContactId.set(null);
    if (_syncMode() === 'demo' || !firebase.db) {
      _contacts.update((list) => list.filter((c) => c.id !== contactId));
      showToast('Contact supprimé.', 'info');
      return;
    }

    _saving.set(true);
    const requestId = createRequestId('contact');
    try {
      await deleteContactRecord(firebase.db, contactId);
      logger.info('Contact deleted', { module: 'CrmStore', requestId, contactId });
      showToast('Contact supprimé.', 'info');
    } catch (err) {
      reportFailure('deleteContact', err, requestId, 'Impossible de supprimer ce contact.', {
        contactId,
      });
    } finally {
      _saving.set(false);
    }
  };

  const addDeal = async (payload: NewDealPayload): Promise<string | null> => {
    const requestId = createRequestId('deal');
    let validated: NewDealPayload;
    try {
      validated = parseWithSchema(NewDealPayloadSchema, payload, requestId, 'Deal');
    } catch (err) {
      reportFailure('addDeal.validate', err, requestId, 'Données d’opportunité invalides.');
      return null;
    }

    const currentUser = authStore.user();
    const record = {
      ...validated,
      ownerId: validated.ownerId || currentUser?.uid || 'demo-user',
      ownerName: validated.ownerName || currentUser?.displayName || 'Commercial',
      updatedAt: new Date().toISOString(),
    };
    if (_syncMode() === 'demo' || !firebase.db) {
      const id = generateLocalId('deal');
      _deals.update((list) => [{ id, ...record }, ...list]);
      showToast(`Opportunité « ${validated.title} » créée.`);
      return id;
    }

    _saving.set(true);
    try {
      const id = await createDealRecord(firebase.db, record);
      logger.info('Deal created', { module: 'CrmStore', requestId, dealId: id });
      showToast(`Opportunité « ${validated.title} » créée.`);
      return id;
    } catch (err) {
      reportFailure('addDeal', err, requestId, 'Impossible de créer cette opportunité.');
      return null;
    } finally {
      _saving.set(false);
    }
  };

  const applyDemoDealWonAutomation = (existing: Deal, now: string) => {
    if (existing.contactId) {
      _contacts.update((list) =>
        list.map((c) => (c.id === existing.contactId ? { ...c, status: 'customer' } : c))
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
  };

  const moveDealStage = async (dealId: string, nextStage: DealStage): Promise<void> => {
    const existing = _deals().find((d) => d.id === dealId);
    if (!existing || existing.stage === nextStage) return;

    const stageMeta = DEAL_STAGES.find((s) => s.id === nextStage);
    const nextProbability = resolveNextProbability(nextStage, existing.probability);
    const now = new Date().toISOString();

    if (_syncMode() === 'demo' || !firebase.db) {
      _deals.update((list) =>
        list.map((d) =>
          d.id === dealId
            ? { ...d, stage: nextStage, probability: nextProbability, updatedAt: now }
            : d
        )
      );
      if (nextStage === 'gagne' && existing.stage !== 'gagne') {
        applyDemoDealWonAutomation(existing, now);
      }
      return;
    }

    const requestId = createRequestId('deal');
    try {
      await updateDealStageRecord(firebase.db, dealId, nextStage, nextProbability, now);
      logger.info('Deal stage moved', {
        module: 'CrmStore',
        requestId,
        dealId,
        fromStage: existing.stage,
        toStage: nextStage,
      });
      showToast(`Opportunité déplacée vers « ${stageMeta?.label ?? nextStage} ».`);
    } catch (err) {
      reportFailure('moveDealStage', err, requestId, 'Impossible de déplacer cette opportunité.', {
        dealId,
        nextStage,
      });
    }
  };

  const deleteDeal = async (dealId: string): Promise<void> => {
    if (_syncMode() === 'demo' || !firebase.db) {
      _deals.update((list) => list.filter((d) => d.id !== dealId));
      showToast('Opportunité supprimée.', 'info');
      return;
    }

    _saving.set(true);
    const requestId = createRequestId('deal');
    try {
      await deleteDealRecord(firebase.db, dealId);
      logger.info('Deal deleted', { module: 'CrmStore', requestId, dealId });
      showToast('Opportunité supprimée.', 'info');
    } catch (err) {
      reportFailure('deleteDeal', err, requestId, 'Impossible de supprimer cette opportunité.', {
        dealId,
      });
    } finally {
      _saving.set(false);
    }
  };

  const addActivity = async (payload: NewActivityPayload): Promise<string | null> => {
    const requestId = createRequestId('act');
    let validated: NewActivityPayload;
    try {
      validated = parseWithSchema(NewActivityPayloadSchema, payload, requestId, 'Activity');
    } catch (err) {
      reportFailure('addActivity.validate', err, requestId, 'Données d’activité invalides.');
      return null;
    }

    const currentUser = authStore.user();
    const record = {
      ...validated,
      ownerId: validated.ownerId || currentUser?.uid || 'demo-user',
      authorName: validated.authorName || currentUser?.displayName || 'Commercial',
      createdAt: new Date().toISOString(),
    };
    if (_syncMode() === 'demo' || !firebase.db) {
      const id = generateLocalId('act');
      _activities.update((list) => [{ id, ...record }, ...list]);
      showToast('Activité enregistrée dans le journal.');
      return id;
    }

    _saving.set(true);
    try {
      const id = await createActivityRecord(firebase.db, record);
      logger.info('Activity created', { module: 'CrmStore', requestId, activityId: id });
      showToast('Activité enregistrée dans le journal.');
      return id;
    } catch (err) {
      reportFailure('addActivity', err, requestId, 'Impossible d’enregistrer cette activité.', {
        contactId: validated.contactId,
      });
      return null;
    } finally {
      _saving.set(false);
    }
  };

  const requestMonthlyForecast = async (): Promise<MonthlyForecastReport | null> => {
    _forecastLoading.set(true);
    _error.set(null);
    const requestId = createRequestId('fcst');
    const startedAt = performance.now();
    try {
      if (_syncMode() === 'firestore' && firebase.functions) {
        const report = await fetchCloudMonthlyForecast(firebase.functions, requestId);
        logger.info('Cloud monthly forecast succeeded', {
          module: 'CrmStore',
          requestId,
          durationMs: performance.now() - startedAt,
        });
        _forecastReport.set(report);
        return report;
      }
      const localReport = buildMonthlyForecastLocal(_deals(), _contacts());
      _forecastReport.set(localReport);
      return localReport;
    } catch (err) {
      logger.warn(
        'Cloud forecast unavailable, falling back to local aggregator',
        { module: 'CrmStore', requestId, durationMs: performance.now() - startedAt },
        err
      );
      const fallback = buildMonthlyForecastLocal(_deals(), _contacts());
      _forecastReport.set(fallback);
      return fallback;
    } finally {
      _forecastLoading.set(false);
    }
  };

  const seedDemoDataToFirestore = async (): Promise<void> => {
    const user = authStore.user();
    if (!firebase.db || !user) return;
    _error.set(null);
    _saving.set(true);
    const requestId = createRequestId('seed');
    try {
      await seedOwnerDemoBatch(firebase.db, user.uid, user.displayName || 'Commercial');
      logger.info('Demo data seeded to Firestore', { module: 'CrmStore', requestId });
      showToast('Données de démonstration chargées avec succès !');
    } catch (err) {
      reportFailure(
        'seedDemoDataToFirestore',
        err,
        requestId,
        'Impossible de charger les données de démonstration.'
      );
    } finally {
      _saving.set(false);
    }
  };

  return {
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
    saving: _saving.asReadonly(),
    toast: _toast.asReadonly(),
    filteredContacts,
    filteredDeals,
    pipelineMetrics,
    kanbanColumns,
    leadScores,
    selectedContact,
    selectedContactDeals,
    selectedContactActivities,
    ownerOptions,
    setSearchQuery: (q: string) => _searchQuery.set(q),
    setSelectedStage: (s: DealStage | 'all') => _selectedStage.set(s),
    setOwnerFilter: (o: string | null) => _ownerFilter.set(o),
    selectContact: (id: string | null) => _selectedContactId.set(id),
    clearError: () => _error.set(null),
    clearToast,
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
