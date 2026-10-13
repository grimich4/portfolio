# Portfolio photo — gasparddavid.fr

Next.js 16 (App Router, Turbopack) + React 19 + Tailwind 4, déployé sur Vercel
depuis `main`. Chaque PR obtient une preview Vercel.

## Commandes
- `npm run dev` — serveur local
- `npm run build` — doit passer avant toute PR
- `npm run lint`
- `node scripts/photos.mjs` — optimise les photos (lancé aussi par GitHub Actions)

## Contenu
**Un dossier = un projet** dans `public/projets/NN-slug/` : photos +
`projet.json`. Format détaillé dans `AJOUTER-UN-PROJET.md`. Les projets sont
lus au build par `lib/projects.ts`. Il n'y a pas de liste de projets dans le
code.

## Structure
- `lib/projects.ts` — lecture des dossiers, dimensions, couvertures.
- `app/page.tsx` — accueil : une couverture plein écran par projet.
- `app/projets/[slug]/page.tsx` — page projet (statique).
- `components/Cover.tsx` — couverture paysage (écran large) / portrait (écran en hauteur).
- `components/Pager.tsx` — accueil : un geste = un projet (molette, clavier, tactile), flèches.
- `components/Gallery.tsx` — vues « Grand » et « Mosaïque », retour.
- `components/Img.tsx` — wrapper next/image avec fondu.
- `components/Theme.tsx` / `Sync.tsx` — couleurs `--bg` / `--fg`.
- `.github/workflows/photos.yml` + `scripts/photos.mjs` — optimisation auto des photos.

## Principes (à respecter)
- **Bicolore** : seulement `--bg` et `--fg` (classes `bg-bg`, `text-fg`,
  opacités et `.tint`). Pas d'autre couleur en dur dans les composants.
- **Sobre** : pas de zoom ni d'effet au survol des images.
- **Léger** : tout est statique ; composants client seulement si nécessaire.
  Pas de librairie d'animation.
- **Images** : toujours un parent qui fixe l'aspect-ratio (pas de layout
  shift), un `sizes` correct, et `preload` seulement pour la première visible.
- Typo : `font-serif` (Instrument Serif) pour les titres, `.cap` pour les
  légendes. Textes en français.
- Mobile d'abord : tester à 375 px de large.
