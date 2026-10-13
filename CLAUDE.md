# Portfolio photo — gasparddavid.fr

Next.js 16 (App Router, Turbopack) + React 19 + Tailwind 4, déployé sur Vercel
depuis `main`. Chaque PR obtient une preview Vercel.

## Commandes
- `npm run dev` — serveur local
- `npm run build` — doit passer avant toute PR
- `npm run lint`

## Structure
- `data/projects.ts` — **source unique du contenu** : projets, couleurs, photos.
- `app/page.tsx` — accueil : une couverture plein écran par projet.
- `app/projets/[slug]/page.tsx` — page projet (généré statiquement).
- `components/Gallery.tsx` — vues « Grand » et « Mosaïque ».
- `components/Img.tsx` — wrapper next/image (flou ou fondu au chargement).
- `components/Theme.tsx` — pose `--bg` / `--fg` côté serveur.
- `components/Sync.tsx` — accueil : couleurs du projet visible.

## Principes (à respecter)
- **Bicolore** : seulement `--bg` et `--fg` (classes `bg-bg`, `text-fg`,
  opacités et `.tint`). Pas d'autre couleur en dur dans les composants.
- **Léger** : tout est statique ; composants client seulement quand c'est
  nécessaire. Pas de librairie d'animation, pas de dépendance lourde.
- **Images** : toujours via `components/Img` avec un `sizes` correct et un
  parent qui fixe l'aspect-ratio (pas de layout shift). Seule la première
  image visible d'une page a `preload`.
- Photos locales dans `public/photos/`, en `.jpg` minuscule, redimensionnées
  à 3000 px max et **sans EXIF** (GPS) avant commit.
- Typo : `font-serif` (Instrument Serif) pour les titres, `.cap` pour les
  légendes. Textes en français.
- Mobile d'abord : tester à 375 px de large.

## Ajouter un projet
Ajouter un objet dans `projects` (`data/projects.ts`) : `slug`, `title`,
`place`, `year`, `colors: { bg, fg }`, `photos`. Les images `pic()` sont
temporaires (picsum.photos) ; les remplacer par des imports locaux.
