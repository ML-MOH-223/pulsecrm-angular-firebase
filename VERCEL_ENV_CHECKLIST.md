# VERCEL_ENV_CHECKLIST.md — Variables & Sécurité d'Environnement (PulseCRM)

## Architecture réelle du projet
- **Frontend déployé sur Vercel** : SPA statique Angular 19 (`dist/pulse-crm/browser`).
- **Backend** : Firebase (Auth, Cloud Firestore, Cloud Functions v2 dans `functions/` déployées séparément sur Firebase, **pas** sur Vercel Serverless).
- **Serveur MCP** : Aucun dans ce dépôt (N/A).
- **Préfixes `VITE_` / `NEXT_PUBLIC_`** : Non applicables à Angular 19.

---

## 1. Variables d'environnement Vercel requises

| Variable | Obligatoire sur Vercel ? | Usage |
|---|---|---|
| *(Aucune variable secrète requise)* | Non | La config Firebase Web est statiquement compilée depuis `src/environments/environment.ts`. |
| `NODE_VERSION` *(optionnel — déjà fixé via `package.json` `engines.node: "22.x"`)* | Recommandé (`22.x`) | Garantit la compatibilité Angular 19 sur les machines de build Vercel. |

---

## 2. Checklist Sécurité & Consoles Cloud (Actions manuelles obligatoires)

- [ ] **Zéro secret serveur dans le frontend** : vérifier qu'aucune clé `serviceAccountKey.json`, clé Firebase Admin SDK ou token privé n'est présent dans `src/` ni dans les variables client.
- [ ] **Firebase Auth — Domaines autorisés** : dans *Firebase Console → Authentication → Settings → Authorized domains*, ajouter :
  - `pulsecrm-angular-firebase.vercel.app`
  - tout domaine personnalisé éventuel.
- [ ] **Google Cloud Console — Restriction de la clé API Web** : dans *APIs & Services → Credentials → Browser key*, activer **HTTP referrers (web sites)** et autoriser uniquement :
  - `https://pulsecrm-angular-firebase.vercel.app/*`
  - `http://localhost:4200/*`
- [ ] **Firestore Security Rules** : publier `firestore.rules` (isolation stricte `ownerId == request.auth.uid` sur `contacts`, `deals`, `activities`) dans *Firebase Console → Firestore Database → Règles*.
