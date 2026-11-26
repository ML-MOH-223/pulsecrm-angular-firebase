# Guide de Débogage — PulseCRM

Ce guide explique comment diagnostiquer rapidement un incident en production ou en local grâce aux `requestId`, aux logs structurés et au catalogue d'erreurs.

---

## 1. Retrouver un incident à partir d'un `requestId`

Chaque opération sensible génère un identifiant préfixé et l'affiche dans le bandeau d'erreur UI sous la forme `(réf. <prefix>_<id>)` :

| Préfixe | Origine |
| :--- | :--- |
| `contact_` | Création, mise à jour ou suppression d'un contact (`CrmStore`) |
| `deal_` | Création, déplacement d'étape ou suppression d'une opportunité (`CrmStore`) |
| `act_` | Création d'une activité dans le journal (`CrmStore`) |
| `fcst_` | Calcul des prévisions mensuelles (`CrmStore` → `calculateMonthlyForecast`) |
| `sync_` | Erreur sur un listener temps réel `onSnapshot` Firestore |
| `auth_` | Flux de connexion, inscription, Google OAuth ou reset password (`AuthStore`) |
| `seed_` | Import des données de démonstration dans Firestore |
| `err_` | Exception non gérée capturée par `GlobalErrorHandler` |
| `boot_` | Échec au démarrage Angular (`src/main.ts` ou `env.ts`) |

### Où chercher les logs ?
1. **Navigateur (DevTools Console)** :
   - En production, chaque log est une ligne **JSON structurée** contenant `timestamp`, `level`, `requestId`, `userId`, `module`, `errorCode`, `durationMs` et `data` (sans secrets : les mots de passe, tokens et clés API sont automatiquement remplacés par `[REDACTED]`).
   - En mémoire, les 100 derniers logs sont accessibles via `logger.getRecentLogs()` (dans les tests ou le debug).
2. **Firebase Console → Functions → Logs** :
   - Filtrer par `jsonPayload.requestId="fcst_..."` pour voir la durée d'exécution (`durationMs`), le `userId` et le volume de documents lus côté serveur.

---

## 2. Diagnostic des 3 incidents types

### Cas A — Action commerciale bloquée (ex. création ou transition d'opportunité refusée)
1. Relever la référence dans le message UI (ex. `réf. deal_a1b2c3d4`).
2. Filtrer les logs navigateur sur `deal_a1b2c3d4`.
3. Lire `errorCode` :
   - `VALIDATION_ERROR` → inspecter `data.errorContext.fields` (ex. montant négatif, probabilité hors `0–100`).
   - `FORBIDDEN` (`providerCode: "permission-denied"`) → vérifier [firestore.rules](../firestore.rules) (`ownerId === request.auth.uid` et champs requis par `isValidDeal`).
   - `EXTERNAL_SERVICE_ERROR` (`providerCode: "unavailable"`) → perte réseau ; vérifier le bandeau hors ligne.

### Cas B — Mauvaise donnée affichée (montant, étape ou contact inattendu)
1. Vérifier si un log `warn` ou `error` avec `module: "CrmStore"` ou `FIRESTORE_LISTENER_ERROR` existe.
2. Contrôler le mapping des documents Firestore dans [crm.repository.ts](../src/app/core/repositories/crm.repository.ts) (`mapContactDoc`, `mapDealDoc`, `mapActivityDoc`) et les calculs purs dans [crm-analytics.utils.ts](../src/app/core/utils/crm-analytics.utils.ts).
3. Vérifier si un filtre actif (`searchQuery`, `ownerFilter`, `selectedStage`) masque ou réduit les KPIs.
4. Écrire un test unitaire reproduisant la donnée exacte dans `crm.repository.spec.ts` ou `crm-analytics.utils.spec.ts` avant de corriger.

### Cas C — Prévisions / export échoué ou incohérent
1. Filtrer les logs navigateur sur le préfixe `fcst_`.
2. Si `level: "warn"` (`Cloud forecast unavailable, falling back to local aggregator`) apparaît : la Cloud Function `calculateMonthlyForecast` est soit non déployée, soit en erreur, et l'application a basculé sur `buildMonthlyForecastLocal`.
3. Vérifier le même `requestId` dans **Firebase Console → Functions → Logs** pour diagnostiquer l'erreur serveur (`unauthenticated`, timeout, ou quota Firestore).

---

## 3. Commandes de diagnostic rapides

```bash
# Vérifier lint + types + tests + build en une commande
npm run check

# Rejouer uniquement les tests unitaires avec couverture
npm run test:ci
```
