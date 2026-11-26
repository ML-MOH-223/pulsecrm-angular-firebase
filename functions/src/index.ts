import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

const db = getFirestore();

interface DealDoc {
  title: string;
  contactId?: string;
  company: string;
  amount: number;
  probability: number;
  stage: string;
  expectedCloseDate?: string;
  updatedAt?: string;
  ownerId?: string;
  ownerName?: string;
}

interface RepForecast {
  ownerId: string;
  ownerName: string;
  openDealsCount: number;
  pipelineAmount: number;
  weightedForecast: number;
  wonAmount: number;
}

interface MonthlyForecastReport {
  month: string;
  generatedAt: string;
  totalPipelineAmount: number;
  totalWeightedForecast: number;
  totalWonAmount: number;
  byRep: RepForecast[];
}

/**
 * Trigger Firestore v2 (`onDocumentUpdated`):
 * Lorsqu'un deal passe au statut `'gagne'`, met automatiquement à jour le `status`
 * du contact associé vers `'customer'` et crée une entrée d'audit dans `activities`.
 */
export const onDealWon = onDocumentUpdated('deals/{dealId}', async (event) => {
  const before = event.data?.before.data() as DealDoc | undefined;
  const after = event.data?.after.data() as DealDoc | undefined;

  if (!before || !after) {
    return;
  }

  // Ne déclencher que lors de la transition vers 'gagne'
  if (before.stage === 'gagne' || after.stage !== 'gagne') {
    return;
  }

  const dealId = event.params.dealId;
  const now = new Date().toISOString();
  const batch = db.batch();

  let contactOwnerId = '';
  if (after.contactId) {
    const contactRef = db.collection('contacts').doc(after.contactId);
    const contactSnap = await contactRef.get();
    if (contactSnap.exists) {
      contactOwnerId = String(contactSnap.data()?.['ownerId'] ?? '');
      batch.update(contactRef, { status: 'customer' });
    }
  }

  const activityRef = db.collection('activities').doc();
  batch.set(activityRef, {
    dealId,
    contactId: after.contactId ?? '',
    type: 'note',
    summary: `Automatisation onDealWon : "${after.title}" (${Number(after.amount ?? 0).toLocaleString('fr-FR')} €) gagné — statut du contact passé à Client.`,
    createdAt: now,
    authorName: 'PulseCRM Automation',
    ownerId: after.ownerId || contactOwnerId,
  });

  await batch.commit();
  logger.info('onDealWon executed successfully', {
    dealId,
    contactId: after.contactId ?? null,
    amount: after.amount,
  });
});

/**
 * HTTPS Callable v2 (`calculateMonthlyForecast`):
 * Agrège les prévisions de ventes (pipeline ouvert, revenu pondéré, deals gagnés)
 * par commercial et retourne un rapport JSON structuré.
 */
export const calculateMonthlyForecast = onCall(async (request): Promise<MonthlyForecastReport> => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'Vous devez être connecté pour générer les prévisions commerciales.'
    );
  }

  const uid = request.auth.uid;
  const [dealsSnap, contactsSnap] = await Promise.all([
    db.collection('deals').where('ownerId', '==', uid).get(),
    db.collection('contacts').where('ownerId', '==', uid).get(),
  ]);

  const contactOwnerMap = new Map<string, string>();
  contactsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (typeof data['ownerId'] === 'string') {
      contactOwnerMap.set(docSnap.id, data['ownerId']);
    }
  });

  const repMap = new Map<string, RepForecast>();
  let totalPipelineAmount = 0;
  let totalWeightedForecast = 0;
  let totalWonAmount = 0;

  dealsSnap.forEach((docSnap) => {
    const deal = docSnap.data() as DealDoc;
    const amount = Number.isFinite(deal.amount) ? Math.max(0, deal.amount) : 0;
    const probability = Math.min(
      100,
      Math.max(0, Number.isFinite(deal.probability) ? deal.probability : 0)
    );

    const ownerId =
      deal.ownerId ||
      (deal.contactId ? contactOwnerMap.get(deal.contactId) : undefined) ||
      'unassigned';
    const ownerName =
      deal.ownerName || (ownerId === 'unassigned' ? 'Non assigné' : ownerId);

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
      rep.wonAmount += amount;
      totalWonAmount += amount;
    } else if (deal.stage !== 'perdu') {
      const weighted = amount * (probability / 100);
      rep.openDealsCount += 1;
      rep.pipelineAmount += amount;
      rep.weightedForecast += weighted;
      totalPipelineAmount += amount;
      totalWeightedForecast += weighted;
    }
  });

  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  const byRep = Array.from(repMap.values())
    .map((r) => ({
      ...r,
      pipelineAmount: Math.round(r.pipelineAmount * 100) / 100,
      weightedForecast: Math.round(r.weightedForecast * 100) / 100,
      wonAmount: Math.round(r.wonAmount * 100) / 100,
    }))
    .sort((a, b) => b.weightedForecast - a.weightedForecast);

  return {
    month,
    generatedAt: now.toISOString(),
    totalPipelineAmount: Math.round(totalPipelineAmount * 100) / 100,
    totalWeightedForecast: Math.round(totalWeightedForecast * 100) / 100,
    totalWonAmount: Math.round(totalWonAmount * 100) / 100,
    byRep,
  };
});
