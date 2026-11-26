# PulseCRM — Phase 0 : Baseline Mesurée & Plan Priorisé

*Date de mesure : 25/11/2026 — Stack : Angular 19.2 (Standalone + Signals) · Tailwind CSS v3 · Firebase v11 (Auth, Firestore, Cloud Functions v2) · Déploiement Netlify.*
*Aucune modification du code applicatif n'a été effectuée pour cette baseline.*

---

## 1. Construction & Qualité Statique

| Vérification | Commande exécutée | Résultat mesuré |
|---|---|---|
| Build production Angular | `npm run build` | ✅ Succès (`23.9 s`, 0 erreur, 0 warning) |
| TypeScript App | `npx tsc --noEmit -p tsconfig.app.json` | ✅ `exit=0` |
| TypeScript Cloud Functions | `npx --prefix functions tsc --noEmit -p functions/tsconfig.json` | ✅ `exit=0` |
| ESLint | `npx eslint src --max-warnings=0` | ❌ **Non installé** (`eslint=False`) |
| Audit dépendances prod | `npm audit --omit=dev` | ⚠️ **11 vulnérabilités** (`0` critical, `8` high, `3` moderate — toutes issues de `@angular/* <= 19.2.25`, principalement SSR/`HttpTransferCache`/XSRF, non utilisées ici car `ssr: false` et pas de `HttpClient`) |
| Cycles d'imports (`madge`) | `npx madge --circular src` | ❌ **Non installé** (`madge=False`) |
| Duplication (`jscpd`) | `npx jscpd src` | ❌ **Non installé** (`jscpd=False`) |
| Code mort (`knip`) | `npx knip` | ❌ **Non installé** (`knip=False`) |
| Usages de `any` | Scan récursif `src/` + `functions/src/` (`24` fichiers `.ts`) | ✅ **0** |
| Usages `@ts-ignore` / `@ts-expect-error` | Scan récursif `src/` + `functions/src/` | ✅ **0** |
| Blocs `catch {` nus (avalent l'erreur) | Scan récursif `catch\s*\{` | ⚠️ **12 occurrences** (`crm.store.ts`: 9, `theme.store.ts`: 2, `firebase.service.ts`: 1) |

### Fichiers les plus gros (> 300 lignes = cible de découpage Phase 4)

| Lignes | Fichier | Problème principal |
|---:|---|---|
| **764** | `src/app/app.component.ts` | Concentre shell, sidebar desktop, tiroir mobile, bottom nav, barre de filtres, onboarding et toasts |
| **662** | `src/app/core/state/crm.store.ts` | Mélange état Signals, abonnements Firestore `onSnapshot`, CRUD, forecast et seed démo |
| **479** | `src/app/features/contacts/contacts-directory.component.ts` | Vue cartes + vue tableau + formulaire quick-add dans un seul composant |
| **333** | `src/app/core/utils/crm-analytics.utils.ts` | Fonctions pures (proche du seuil, déjà bien structuré) |
| **303** | `src/app/features/pipeline/pipeline-kanban.component.ts` | Grille Kanban + gestion drag-and-drop + actions rapides |

---

## 2. Performance

### Taille des bundles (`npm run build`)

| Chunk | Brut | Transféré estimé (gzip) | Type |
|---|---:|---:|---|
| `chunk-Y5S3LTMN.js` (Firebase SDK + Angular core) | `626.05 kB` | `167.34 kB` | Initial |
| `main-FQAQBPPU.js` (Code applicatif) | `219.39 kB` | `47.18 kB` | Initial |
| `styles-PDHX5PI7.css` | `53.13 kB` | `8.17 kB` | Initial |
| `polyfills-5CFQRCPP.js` (`zone.js`) | `34.59 kB` | `11.33 kB` | Initial |
| **Total Initial** | **`933.16 kB`** | **`234.03 kB`** | **Initial** |
| `forecast-modal-component` (`@defer`) | `9.05 kB` | `2.66 kB` | Lazy |

### Requêtes par écran & Base de données (Firestore)
- **Écran principal connecté** : 3 abonnements temps réel `onSnapshot` (`contacts`, `deals`, `activities`) filtrés par `where('ownerId', '==', uid)`.
- **Pagination / plafond (`limit`)** : ⚠️ **absent** (si un commercial accumule > 500 activités/contacts, tout est chargé en mémoire au démarrage).
- **Cache hors ligne** : ✅ `persistentLocalCache` + `persistentMultipleTabManager` activés.
- **SQL / N+1** : N/A (architecture NoSQL Cloud Firestore ; aucun N+1 côté client grâce aux Maps `computed()`).
- **Lighthouse Mobile (3G / CPU ×4) & Latences p50/p95** : ❌ **Non mesurés à ce stade** (`lighthouse=False`, `playwright=False`, Cloud Functions non déployées en production Blaze). Seront mesurés via `npx lighthouse` / émulation Chrome dès validation du plan.

---

## 3. Robustesse & Couverture de Tests

### Couverture mesurée (`npx ng test --watch=false --browsers=ChromeHeadless --code-coverage`)

| Métrique | Couverture actuelle | Détail |
|---|---:|---|
| **Statements** | **30.59 %** | `242 / 791` |
| **Branches** | **22.67 %** | `73 / 322` |
| **Functions** | **14.55 %** | `23 / 158` |
| **Lines** | **31.63 %** | `230 / 727` |
| **Tests réussis** | **9 / 9** | `crm-analytics.utils.spec.ts` (7 tests) + `app.component.spec.ts` (2 tests) |

### Zones critiques non couvertes (0 % de tests dédiés)
- `auth.store.ts` (connexion, inscription, réinitialisation mot de passe, traduction d'erreurs).
- `crm.store.ts` (CRUD, transitions d'étapes Kanban, isolation `ownerId`, fallback forecast, import démo).
- `functions/src/index.ts` (`onDealWon`, `calculateMonthlyForecast`).
- `firestore.rules` (tests de non-régression anti-IDOR / ownership).
- **Isolation des tests** : `app.component.spec.ts` instancie le vrai `FirebaseService` au lieu d'un double de test.

### Risques d'intégrité & sécurité détectés
1. **Validation runtime absente** : pas de schémas Zod sur les payloads CRUD ni dans `functions/src/index.ts` (validation uniquement via Reactive Forms côté UI et `firestore.rules`).
2. **Suppression sans cascade ni archivage** : `deleteContact()` laisse les `deals` et `activities` orphelins en base.
3. **Transitions d'état non verrouillées** : aucune machine d'états explicite pour `DealStage` ni champ `version` / vérification d'idempotence sur `moveDealStage`.
4. **Erreurs avalées (`12 catch {}`)** : aucun `AppError` structuré, aucun `ErrorHandler` global Angular, aucun `requestId` de traçabilité.
5. **Cloud Functions** : pas de rate-limiting ni d'endpoint `/health` ; `onDealWon` repose sur le plan Blaze (non actif en Spark).
6. **Clé API Firebase** : doit être restreinte par référent HTTP dans Google Cloud Console (`localhost` + domaine Netlify).

---

## 4. Responsive (320 / 360 / 390 / 768 / 1024 / 1440 px)

- **État actuel (statique)** : fondations mobile-first en place (`viewport-fit=cover`, `.pb-safe`, `100dvh`, `clamp()` sur KPIs, champs `≥ 16 px`, zones tactiles `≥ 44 px`, vue cartes sur Contacts et Prévisions mobiles, grille Kanban sans scroll horizontal, `AGENTS.md` rédigé).
- **Manques de vérification** : aucun test automatisé **Playwright** à `320/360/390/768/1024/1440 px` (portrait & paysage) prouvant `scrollWidth <= innerWidth` et l'absence de chevauchement.

---

## 5. Plan Priorisé par `(Gain × Risque Évité) / Effort`

### Objectifs Chiffrés Cibles

| Indicateur | Baseline actuelle | Objectif cible |
|---|---:|---:|
| JS initial transféré (gzip) | `234.03 kB` | **`< 195 kB`** (code-splitting routes/vues + `@defer` sur modales & onglets) |
| Couverture globale (Lines) | `31.63 %` | **`≥ 70 %`** (et **`≥ 90 %`** sur `utils`, `auth.store`, `crm.store`, validations) |
| Blocs `catch {` avalant l'erreur | `12` | **`0`** (tous routés vers `AppError` + logger structuré) |
| Fichiers `> 300` lignes | `5` (max `764`) | **`0`** (découpage propre par couche / sous-composant) |
| Erreurs ESLint / TSC / Cycles `madge` | Non mesuré / `0` / Non mesuré | **`0` / `0` / `0`** |
| Débordement horizontal `320 → 1440 px` | Non testé par Playwright | **`0 px` mesuré par Playwright** sur les 6 largeurs |
| Pagination / plafond Firestore | Illimité | **`limit(200)` + chargement progressif** |

### Feuille de Route (1 commit vert par étape)

| Priorité | Phase | Action | Score `(G×R)/E` |
|---:|---|---|---:|
| **1** | **Phase 1.1** | Filet de tests unitaires sur `auth.store.ts`, `crm.store.ts` (transitions, CRUD, isolation), mock `FirebaseService` dans `app.component.spec.ts` | Très élevé |
| **2** | **Phase 1.2–1.3** | Schémas **Zod** partagés pour `Contact`, `Deal`, `Activity` ; machine d'états `DealStage` explicite ; gestion propre de la suppression contact (logique ou cascade batch) | Très élevé |
| **3** | **Phase 1.4–1.5** | `AppError` (codes stables + `requestId`) + `GlobalErrorHandler` Angular + suppression des 12 `catch {}` nus + timeouts/dégradation propre | Élevé |
| **4** | **Phase 2** | Lazy loading via routes Angular (`/pipeline`, `/contacts`) + `@defer` sur `DealFormModalComponent` & `ContactDetailDrawerComponent` + `limit()` Firestore ; re-mesure bundle & Lighthouse mobile | Élevé |
| **5** | **Phase 3** | Suite de tests **Playwright** automatisée aux 6 largeurs (`320/360/390/768/1024/1440`) vérifiant `scrollWidth <= innerWidth`, modales, formulaires et Dark Mode | Moyen-élevé |
| **6** | **Phase 4** | Découpage des 5 fichiers > 300 lignes (couches `repository` / `state` / sous-composants UI), installation ESLint strict + Prettier + CI GitHub Actions + `docs/ARCHITECTURE.md` & `docs/DEBUGGING.md` | Moyen |
