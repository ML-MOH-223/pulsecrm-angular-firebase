## Résumé des changements

- Objectif :
- Fichiers principaux touchés :

## Checklist Qualité & Sécurité

- [ ] `npm run lint` passe sans erreur
- [ ] `npm run typecheck` passe sans erreur (frontend + `functions/`)
- [ ] `npm run test:ci` passe avec couverture à jour
- [ ] `npm run build` passe sans erreur
- [ ] Aucun `any`, `@ts-ignore`, `console.*` ou `catch {}` silencieux ajouté
- [ ] Règles d'isolation `ownerId` / Firestore Rules respectées
- [ ] Règles mobile-first (`AGENTS.md`) respectées si modification UI
- [ ] Documentation mise à jour si contrat/architecture modifié
