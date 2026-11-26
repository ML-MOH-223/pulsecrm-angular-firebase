import {
  DocumentData,
  Firestore,
  Timestamp,
  Unsubscribe,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Functions, httpsCallable } from 'firebase/functions';
import {
  Activity,
  Contact,
  Deal,
  DealStage,
  MonthlyForecastReport,
} from '../models/crm.model';
import { MonthlyForecastReportSchema, parseWithSchema } from '../schemas/crm.schemas';
import { SEED_ACTIVITIES, SEED_CONTACTS, SEED_DEALS } from '../state/crm-seed.data';

export function toIsoString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function mapContactDoc(id: string, data: DocumentData): Contact {
  return {
    id,
    firstName: String(data['firstName'] ?? ''),
    lastName: String(data['lastName'] ?? ''),
    email: String(data['email'] ?? ''),
    phone: String(data['phone'] ?? ''),
    company: String(data['company'] ?? ''),
    status: (data['status'] ?? 'lead') as Contact['status'],
    ownerId: String(data['ownerId'] ?? ''),
    createdAt: toIsoString(data['createdAt']),
  };
}

export function mapDealDoc(id: string, data: DocumentData): Deal {
  return {
    id,
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
}

export function mapActivityDoc(id: string, data: DocumentData): Activity {
  return {
    id,
    dealId: data['dealId'] ? String(data['dealId']) : null,
    contactId: String(data['contactId'] ?? ''),
    type: (data['type'] ?? 'note') as Activity['type'],
    summary: String(data['summary'] ?? ''),
    createdAt: toIsoString(data['createdAt']),
    authorName: String(data['authorName'] ?? 'Équipe'),
    ownerId: data['ownerId'] ? String(data['ownerId']) : undefined,
  };
}

function sortByDateDesc<T>(items: T[], getDate: (item: T) => string): T[] {
  return items.sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime());
}

export function subscribeOwnerCollections(
  db: Firestore,
  uid: string,
  handlers: {
    onContacts: (items: Contact[]) => void;
    onDeals: (items: Deal[]) => void;
    onActivities: (items: Activity[]) => void;
    onError: (collectionName: string, err: Error) => void;
  }
): Unsubscribe {
  const unsubs: Unsubscribe[] = [
    onSnapshot(
      query(collection(db, 'contacts'), where('ownerId', '==', uid)),
      (snap) => {
        const items = sortByDateDesc(
          snap.docs.map((d) => mapContactDoc(d.id, d.data())),
          (c) => c.createdAt
        );
        handlers.onContacts(items);
      },
      (err) => handlers.onError('contacts', err)
    ),
    onSnapshot(
      query(collection(db, 'deals'), where('ownerId', '==', uid)),
      (snap) => {
        const items = sortByDateDesc(
          snap.docs.map((d) => mapDealDoc(d.id, d.data())),
          (d) => d.updatedAt
        );
        handlers.onDeals(items);
      },
      (err) => handlers.onError('deals', err)
    ),
    onSnapshot(
      query(collection(db, 'activities'), where('ownerId', '==', uid)),
      (snap) => {
        const items = sortByDateDesc(
          snap.docs.map((d) => mapActivityDoc(d.id, d.data())),
          (a) => a.createdAt
        );
        handlers.onActivities(items);
      },
      (err) => handlers.onError('activities', err)
    ),
  ];

  return () => {
    for (const unsub of unsubs) {
      unsub();
    }
  };
}

export async function createContactRecord(
  db: Firestore,
  record: Omit<Contact, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'contacts'), record);
  return ref.id;
}

export async function updateContactRecord(
  db: Firestore,
  contactId: string,
  patch: Partial<Omit<Contact, 'id' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'contacts', contactId), patch);
}

export async function deleteContactRecord(db: Firestore, contactId: string): Promise<void> {
  await deleteDoc(doc(db, 'contacts', contactId));
}

export async function createDealRecord(db: Firestore, record: Omit<Deal, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'deals'), record);
  return ref.id;
}

export async function updateDealStageRecord(
  db: Firestore,
  dealId: string,
  stage: DealStage,
  probability: number,
  updatedAt: string
): Promise<void> {
  await updateDoc(doc(db, 'deals', dealId), { stage, probability, updatedAt });
}

export async function deleteDealRecord(db: Firestore, dealId: string): Promise<void> {
  await deleteDoc(doc(db, 'deals', dealId));
}

export async function createActivityRecord(
  db: Firestore,
  record: Omit<Activity, 'id'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'activities'), record);
  return ref.id;
}

export async function seedOwnerDemoBatch(
  db: Firestore,
  uid: string,
  author: string
): Promise<void> {
  const batch = writeBatch(db);
  for (const c of SEED_CONTACTS) {
    const { id, ...rest } = c;
    batch.set(doc(db, 'contacts', `${uid}_${id}`), { ...rest, ownerId: uid });
  }
  for (const d of SEED_DEALS) {
    const { id, contactId, ...rest } = d;
    batch.set(doc(db, 'deals', `${uid}_${id}`), {
      ...rest,
      contactId: contactId ? `${uid}_${contactId}` : '',
      ownerId: uid,
      ownerName: author,
    });
  }
  for (const a of SEED_ACTIVITIES) {
    const { id, contactId, dealId, ...rest } = a;
    batch.set(doc(db, 'activities', `${uid}_${id}`), {
      ...rest,
      contactId: `${uid}_${contactId}`,
      dealId: dealId ? `${uid}_${dealId}` : null,
      ownerId: uid,
    });
  }
  await batch.commit();
}

export async function fetchCloudMonthlyForecast(
  functions: Functions,
  requestId: string
): Promise<MonthlyForecastReport> {
  const callable = httpsCallable<{ requestId: string }, MonthlyForecastReport>(
    functions,
    'calculateMonthlyForecast'
  );
  const result = await callable({ requestId });
  return parseWithSchema(
    MonthlyForecastReportSchema,
    result.data,
    requestId,
    'MonthlyForecastReport'
  );
}
