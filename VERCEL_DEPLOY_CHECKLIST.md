# VERCEL_DEPLOY_CHECKLIST.md — Déploiement Production Vercel (PulseCRM)

## 1. Paramètres dans le Dashboard Vercel (Project Settings → Build & Development)

- [ ] **Root Directory** : `.` (racine du dépôt — ne pas pointer vers `functions/`).
- [ ] **Build Command** : `npm run build` (défini dans `vercel.json`).
- [ ] **Output Directory** : `dist/pulse-crm/browser` (**critique** pour Angular 19 `application` builder ; ne pas laisser `dist/pulse-crm`).
- [ ] **Node.js Version** : `22.x` (aligné avec `package.json` → `engines.node`).
- [ ] **Production Branch** : `main`.

## 2. Vérifications avant chaque push sur `main`

- [ ] `npx tsc --noEmit -p tsconfig.app.json` (0 erreur)
- [ ] `npm run build` (0 erreur, `dist/pulse-crm/browser/index.html` généré avec `<link rel="stylesheet" href="styles-....css">`)
- [ ] `npx ng test --watch=false --browsers=ChromeHeadless` (tous les tests verts)
- [ ] Aucun changement involontaire dans `vercel.json` ou `src/environments/environment.ts`

## 3. Vérifications post-déploiement sur `https://pulsecrm-angular-firebase.vercel.app/`

- [ ] La page se charge avec les styles Tailwind complets en **Thème Clair** et **Thème Sombre**.
- [ ] La connexion **Google** fonctionne (domaine autorisé dans Firebase Auth + en-tête `Cross-Origin-Opener-Policy: same-origin-allow-popups` actif).
- [ ] La connexion **Email / Mot de passe** et l'accès **Démo** fonctionnent.
- [ ] Création / déplacement d'opportunité Kanban et ajout de contact synchronisent en temps réel dans Firestore.
- [ ] Rechargement (`F5`) sur une URL directe ne renvoie pas de `404` (réécriture SPA vers `/index.html`).
- [ ] Mobile `360 px` : aucun débordement horizontal, bottom nav visible au-dessus des safe areas.

## 4. Déploiement séparé du backend Firebase (hors Vercel)

```powershell
# Règles Firestore & index
npx firebase-tools deploy --only firestore:rules,firestore:indexes

# Cloud Functions v2 (nécessite le plan Blaze)
npx firebase-tools deploy --only functions
```
