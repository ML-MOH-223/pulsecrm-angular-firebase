# AGENTS.md — Règles de Responsive Design & Optimisation Mobile (PulseCRM)

Toute contribution UI sur **PulseCRM** doit respecter ces 6 règles non négociables, adaptées aux écrans compacts (320–360 px) et aux connexions mobiles instables (3G/4G) :

1. **Mobile-First sans débordement horizontal (`320 px` minimum)**
   - Toujours concevoir en mono-colonne par défaut (`grid-cols-1`) avant d'élargir aux breakpoints `sm (640px)`, `md (768px)`, `lg (1024px)` et `xl (1280px)`.
   - Interdiction des largeurs fixes qui forcent un scroll horizontal de page ; utiliser des grilles fluides ou une vue en cartes sur mobile (`< md`) pour tout tableau de données.

2. **Zones tactiles ≥ 44 × 44 px & Safe Areas**
   - Tout bouton, champ, lien d'action ou contrôle interactif sur mobile doit respecter une zone tactile minimale de `44 × 44 px` (`.ds-btn`, `.ds-input`, `min-h-[44px]`).
   - Les barres fixes en bas d'écran et tiroirs plein écran doivent utiliser `100dvh` et `.pb-safe` (`env(safe-area-inset-bottom)`), avec `viewport-fit=cover` sans jamais bloquer le zoom utilisateur (`user-scalable=no` interdit).

3. **Champs de saisie ≥ 16 px sur mobile**
   - Tous les `<input>`, `<select>` et `<textarea>` doivent avoir une taille de police d'au moins `16 px` (`text-base` / `.ds-input`) sur mobile afin d'éviter le zoom automatique forcé sur iOS Safari lors de l'ouverture du clavier virtuel.

4. **Aucune action critique « hover-only » & gestes accessibles**
   - Ne jamais masquer une action derrière `:hover` uniquement ; encapsuler les effets de survol esthétiques dans `@media (hover: hover)` et toujours fournir une alternative en un tap aux gestes complexes (ex. bouton *Avancer →* et `<select>` en alternative au drag-and-drop Kanban).

5. **Résilience 3G/4G & appareils modestes**
   - Maintenir le cache persistant hors ligne Firestore (`persistentLocalCache`) et informer discrètement l'utilisateur lors d'une perte réseau (`navigator.onLine`).
   - Différer le chargement des modales/vues non critiques (`@defer`), afficher des skeletons shimmer pendant le chargement et respecter `prefers-reduced-motion: reduce`.

6. **Tokens Design System & Contraste WCAG AA (Clair / Sombre)**
   - Réutiliser les variables CSS de `src/styles/tokens.css` (aucun noir pur `#000000` en Dark Mode) et les primitives `.ds-card`, `.ds-btn`, `.ds-input`, `.ds-badge` afin de garantir un contraste AA constant dans les deux thèmes et au zoom 200 %.
