# Architecture — PulseCRM

## Vue d'ensemble

PulseCRM suit une séparation stricte par responsabilité :

```mermaid
flowchart LR
  UI["Composants UI Standalone<br/>(app.component, sidebar, kanban, contacts)"]
  Store["Stores Signals<br/>(AuthStore, CRM_STORE, ThemeStore)"]
  Schemas["Validation Zod<br/>(crm.schemas.ts, config/env.ts)"]
  Repo["Repository I/O<br/>(crm.repository.ts)"]
  Pure["Fonctions Pures<br/>(crm-analytics.utils.ts)"]
  Obs["Observabilité & Erreurs<br/>(AppError, StructuredLogger, requestId)"]
  FB["Firebase Cloud<br/>(Auth, Firestore, Functions v2)"]

  UI --> Store
  Store --> Schemas
  Store --> Repo
  Store --> Pure
  Store --> Obs
  Repo --> FB
```

## Organisation des dossiers

- `src/app/core/config/` — Configuration validée au démarrage (`env.ts`).
- `src/app/core/errors/` — `AppError` (et sous-classes), catalogue `error-codes.ts`, `GlobalErrorHandler`.
- `src/app/core/observability/` — `StructuredLogger` (redaction automatique + ring buffer) et générateur `requestId`.
- `src/app/core/schemas/` — Schémas Zod (`NewContactPayloadSchema`, `NewDealPayloadSchema`, `NewActivityPayloadSchema`, `MonthlyForecastReportSchema`).
- `src/app/core/repositories/` — Couche d'accès Firestore & Cloud Functions (`crm.repository.ts`).
- `src/app/core/state/` — Stores réactifs basés sur Angular Signals (`crm.store.ts`, `theme.store.ts`, `crm-seed.data.ts`).
- `src/app/core/auth/` — Authentification Firebase & mode démo (`auth.store.ts`).
- `src/app/core/utils/` — Fonctions métier pures et déterministes (`crm-analytics.utils.ts`).
- `src/app/shared/layout/` — Composants de layout partagés (`app-sidebar.component.ts`).
- `src/app/features/` — Vues métier (`auth`, `contacts`, `dashboard`, `pipeline`).
- `functions/src/index.ts` — Cloud Functions v2 (`onDealWon`, `calculateMonthlyForecast`).

## Traçabilité bout-en-bout (`requestId`)

```mermaid
sequenceDiagram
  participant User as Utilisateur
  participant Store as CrmStore
  participant Repo as crm.repository
  participant Fn as Cloud Function (europe-west1)
  participant Log as StructuredLogger / Firebase Logs

  User->>Store: Demande prévisions mensuelles
  Store->>Store: createRequestId('fcst') -> fcst_xxx
  Store->>Repo: fetchCloudMonthlyForecast(functions, fcst_xxx)
  Repo->>Fn: httpsCallable('calculateMonthlyForecast', { requestId: fcst_xxx })
  Fn->>Log: logger.info('started', { requestId: fcst_xxx, userId })
  Fn-->>Repo: MonthlyForecastReport { requestId: fcst_xxx, ... }
  Repo->>Repo: parseWithSchema(MonthlyForecastReportSchema)
  Repo-->>Store: Rapport validé
  Store->>Log: logger.info('completed', { requestId: fcst_xxx, durationMs })
```

## Isolation des données (`ownerId`)

- Toutes les requêtes Firestore filtrent strictement par `where('ownerId', '==', user.uid)`.
- Les règles [firestore.rules](../firestore.rules) imposent `isOwner(resource.data)` en lecture/écriture/suppression et `keepsImmutableOwner()` en mise à jour.
- La Cloud Function `calculateMonthlyForecast` filtre également ses lectures par `request.auth.uid`.
