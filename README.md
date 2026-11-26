# PulseCRM — Angular 19 & Firebase

CRM B2B temps réel conçu avec **Angular 19.2** (Standalone Components, Signals, Tailwind CSS v3) et **Firebase v11** (Authentication, Cloud Firestore avec cache hors-ligne persistant, Cloud Functions v2), déployé sur **Vercel**.

---

## Prérequis

- **Node.js** : `22.x` (`node -v`)
- **npm** : `10+`
- **Google Chrome** (pour `npm run test:ci` via Karma `ChromeHeadless`)
- Optionnel : **Firebase CLI** (`npm i -g firebase-tools`) pour déployer `firestore.rules` et `functions/`

---

## Installation & Démarrage

```bash
# 1. Installer les dépendances frontend et Cloud Functions
npm install
npm --prefix functions install

# 2. Lancer le serveur de développement (http://localhost:4200)
npm start
```

> Sans configuration Firebase dans `src/environments/environment.ts`, l'application démarre automatiquement en **Mode Démo Local** (données seed déterministes en mémoire). Voir [.env.example](.env.example) et [VERCEL_ENV_CHECKLIST.md](VERCEL_ENV_CHECKLIST.md) pour la configuration Firebase.

---

## Commandes principales

| Commande | Description |
| :--- | :--- |
| `npm start` | Démarre le serveur Angular local (`http://localhost:4200`) |
| `npm run build` | Build de production optimisé (`dist/pulse-crm/browser`) |
| `npm run lint` | Exécute ESLint strict sur `src/` et `functions/src/` |
| `npm run typecheck` | Vérifie TypeScript (`tsconfig.app.json` + `functions/tsconfig.json`) |
| `npm run test:ci` | Lance la suite Karma/Jasmine headless avec rapport de couverture |
| `npm run check` | Exécute la porte qualité complète : `lint → typecheck → test:ci → build` |
| `npm run format:check` | Vérifie le formatage Prettier |

---

## Documentation technique

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Architecture en couches, flux temps réel et diagrammes Mermaid
- [docs/DEBUGGING.md](docs/DEBUGGING.md) — Guide de diagnostic par `requestId`, logs structurés et erreurs
- [docs/error-codes.md](docs/error-codes.md) — Catalogue officiel des codes d'erreur (`ERROR_CATALOG`)
- [docs/adr/0001-observability-and-repository-separation.md](docs/adr/0001-observability-and-repository-separation.md) — Décisions d'architecture (ADR)
- [AGENTS.md](AGENTS.md) — Règles UI mobile-first, conventions de code et interdits
- [VERCEL_DEPLOY_CHECKLIST.md](VERCEL_DEPLOY_CHECKLIST.md) & [VERCEL_ENV_CHECKLIST.md](VERCEL_ENV_CHECKLIST.md) — Déploiement & variables
