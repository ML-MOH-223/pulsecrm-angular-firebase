# ADR 0001 — Observabilité structurée, séparation Repository et validation Zod

- **Statut** : Accepté
- **Date** : 2026-11-26

## Contexte

Le diagnostic initial de PulseCRM a mis en évidence :
1. Un store monolithique (`crm.store.ts`, 663 lignes) mélangeant état Signals, listeners Firestore, mapping DTO et appels Cloud Functions.
2. Neuf blocs `catch {}` avalant les erreurs Firestore sans conserver la cause racine ni corrélation `requestId`.
3. Aucune validation runtime aux frontières (payloads utilisateur, retours Cloud Functions, configuration `environment.ts`).
4. Aucun linter ni pipeline CI bloquant les régressions.

## Décisions

1. **Séparation Store / Repository** : toute la persistance Firestore et les appels `httpsCallable` sont isolés dans `src/app/core/repositories/crm.repository.ts`. Le store `crm.store.ts` conserve uniquement l'état Signals, l'orchestration et le mode démo.
2. **Erreurs typées & traçabilité** : introduction de `AppError` (et sous-classes), du catalogue unique `ERROR_CATALOG`, du `GlobalErrorHandler` Angular et du `StructuredLogger` avec redaction automatique et `requestId` propagé jusqu'à `calculateMonthlyForecast`.
3. **Validation Zod** : les payloads CRUD, la réponse Cloud Function et `environment.ts` sont validés avec Zod (`src/app/core/schemas/crm.schemas.ts` et `src/app/core/config/env.ts`).
4. **Garde-fous CI** : ajout d'ESLint strict (`no-explicit-any`, `no-floating-promises`, `no-console`, `complexity`), Prettier et GitHub Actions (`.github/workflows/ci.yml`).

## Conséquences

- **Positives** : chaque erreur est contextualisée et corrélable par `requestId` ; les régressions sont bloquées avant merge ; la couverture de tests est passée de 30,38 % à > 55 %.
- **Compromis** : l'ajout de Zod augmente la taille du bundle initial (~76 kB transférés en plus). Acceptable au regard de la fiabilité runtime ; à surveiller si le budget mobile 3G se resserre.
