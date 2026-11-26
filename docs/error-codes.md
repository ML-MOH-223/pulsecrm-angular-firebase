# Catalogue des codes d'erreur (`ERROR_CATALOG`)

Source de vérité dans le code : [src/app/core/errors/error-codes.ts](../src/app/core/errors/error-codes.ts).

| Code | HTTP | Cause principale | Emplacement du diagnostic |
| :--- | :---: | :--- | :--- |
| `VALIDATION_ERROR` | 400 | Payload utilisateur, document ou configuration invalide selon Zod | `src/app/core/schemas/` & `src/app/core/config/env.ts` |
| `NOT_FOUND` | 404 | Ressource contact, opportunité ou activité introuvable | `src/app/core/state/crm.store.ts` |
| `FORBIDDEN` | 403 | Règle Firestore (`ownerId != request.auth.uid`) ou accès refusé | `firestore.rules` & `functions/src/index.ts` |
| `CONFLICT` | 409 | Doublon ou conflit de modification concurrente | `src/app/core/state/crm.store.ts` |
| `EXTERNAL_SERVICE_ERROR` | 502 | Indisponibilité réseau, timeout Cloud Functions ou Google Auth | `src/app/core/firebase/firebase.service.ts` & `functions/src/index.ts` |
| `DATABASE_ERROR` | 500 | Échec lecture/écriture Firestore | `src/app/core/state/crm.store.ts` & `crm.repository.ts` |
| `AUTH_ERROR` | 401 | Identifiants invalides ou échec Firebase Auth | `src/app/core/auth/auth.store.ts` |
| `AUTH_UNAUTHORIZED_DOMAIN` | 403 | Domaine Vercel/Preview absent des Authorized Domains Firebase | `src/app/core/auth/auth.store.ts` & `VERCEL_ENV_CHECKLIST.md` |
| `AUTH_POPUP_BLOCKED` | 409 | Pop-up bloquée par le navigateur (bascule `signInWithRedirect`) | `src/app/core/auth/auth.store.ts` |
| `FIRESTORE_LISTENER_ERROR` | 500 | Erreur sur un abonnement temps réel `onSnapshot` | `src/app/core/state/crm.store.ts` |
| `FORECAST_FALLBACK` | 503 | Cloud Function indisponible, bascule vers agrégateur local | `src/app/core/state/crm.store.ts` & `functions/src/index.ts` |
| `STORAGE_ERROR` | 500 | Quota ou restriction `localStorage` / IndexedDB | `src/app/core/state/theme.store.ts` & `firebase.service.ts` |
| `BOOTSTRAP_ERROR` | 500 | Exception critique lors de `bootstrapApplication()` | `src/main.ts` & `src/app/app.config.ts` |
| `UNKNOWN_ERROR` | 500 | Exception non catégorisée capturée par `GlobalErrorHandler` | `src/app/core/errors/global-error-handler.ts` |
