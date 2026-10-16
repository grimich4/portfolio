# Portfolio photo — gasparddavid.fr

Next.js 16 (App Router, Turbopack) + React 19 + Tailwind 4, déployé sur Vercel
depuis `main`. Chaque PR obtient une preview Vercel.

## Commandes
- `npm run dev` — serveur local
- `npm run build` — doit passer avant toute PR (lance d'abord `scripts/variants.mjs`)
- `npm run lint`
- `node scripts/photos.mjs` — optimise les photos (lancé aussi par GitHub Actions)
- `node scripts/drive.mjs` — synchro Google Drive (besoin de GDRIVE_KEY / GDRIVE_FOLDER)

## Contenu
**Un dossier = un projet** dans `public/projets/NN-slug/` : photos +
`projet.json`. Format détaillé dans `AJOUTER-UN-PROJET.md`. Les projets sont
lus au build par `lib/projects.ts`. Il n'y a pas de liste de projets dans le
code.

**Série Paris** : `public/paris/NN-…/` (NN = arrondissement 1-20, un dossier par
arrondissement) + `public/paris/serie.json`. Vient du dossier Drive « Site/Paris ».
Champs en plus : `support`, `quartier`. Pages `/paris` (carte) et `/paris/11e`.

## Structure
- `lib/projects.ts` — lecture des dossiers, dimensions, couvertures.
- `app/page.tsx` — accueil : une couverture plein écran par projet.
- `app/projets/[slug]/page.tsx` — page projet (statique).
- `components/Cover.tsx` — couverture paysage (écran large) / portrait (écran en hauteur).
- `components/useTrack.ts` — « un geste = une étape » : la page ne défile pas, le contenu
  glisse (`transform` + transition CSS, sous-pixel, carte graphique). Enchaînement en vol
  à vitesse continue, suivi du doigt + élan. **Ne pas revenir à scrollTo** (saccades en
  fin de ralenti, et le smooth scroll natif est coupé par Windows « effets d'animation »).
- `components/Header.tsx` — liens en ligne sur ordi, « Menu » plein écran sur téléphone.
- `components/Pager.tsx` — accueil : conteneur fixe + piste qui glisse, une étape par projet, flèches.
- `components/ProjectView.tsx` — page projet : vue « Grand » (piste, colonne fixe titre + compteur sur ordi, une photo centrée par
  geste) et « Mosaïque » (défilement normal), barre fixe, retour, projet suivant.
- `app/paris/page.tsx` + `components/ParisMap.tsx` — carte des 20 arrondissements, rendue côté
  serveur (SVG) ; `components/MapControl.tsx` = survol par délégation (`data-on`), couleurs,
  retour `#11e`. Styles : section « Carte de Paris » de `globals.css`.
- `app/paris/[slug]/page.tsx` — page d'un arrondissement (ProjectView, retour vers /paris).
- `data/paris-map.json` — tracés générés par `scripts/paris-map.mjs` depuis
  `data/paris-quartiers.geojson` (80 quartiers, Ville de Paris, ODbL : garder la mention).
- `scripts/variants.mjs` (prebuild) — variantes WebP 480→2400 px pré-calculées + aperçu flou,
  nom avec empreinte, budget de poids par pixel ; cache dans `.next/cache/variants`.
  `public/_img/` est généré (gitignore).
- `components/variant.ts` — loader next/image vers ces variantes (aucune transformation Vercel).
- `components/Img.tsx` — wrapper next/image : aperçu flou instantané, `eager` pour les voisines.
- `components/Theme.tsx` / `Sync.tsx` — couleurs `--bg` / `--fg`.
- `.github/workflows/photos.yml` + `scripts/photos.mjs` — optimisation auto des photos envoyées sur GitHub.
- `.github/workflows/drive.yml` + `scripts/drive.mjs` — synchro horaire du dossier Drive « Site » ;
  les projets synchronisés ont un `.drive.json` (ne pas éditer à la main, ils seraient écrasés).
- `scripts/optim.mjs` — optimisation partagée (HEIC → JPEG, 3000 px, sans EXIF).
- `scripts/mood.mjs` — couleurs automatiques (OKLCH : chaud → papier + encre, froid → fond profond + crème) → `.mood.json`
  (utilisé si projet.json ne fixe pas `couleurs`). `node scripts/mood.mjs` pour tout recalculer.

## Principes (à respecter)
- **Bicolore** : seulement `--bg` et `--fg` (classes `bg-bg`, `text-fg`,
  opacités et `.tint`). Pas d'autre couleur en dur dans les composants.
- **Sobre** : pas de zoom ni d'effet au survol des images.
- **Léger** : tout est statique ; composants client seulement si nécessaire.
  Pas de librairie d'animation.
- **Mouvement toujours présent** : ne pas couper les transitions avec
  `prefers-reduced-motion` (beaucoup de Windows l'activent par défaut → site figé).
- **Images** : toujours un parent qui fixe l'aspect-ratio (pas de layout
  shift), un `sizes` égal à la largeur réellement affichée, `preload` seulement
  pour la première visible, et passer par `loaderFor` (variantes pré-calculées).
- Typo : `font-serif` (Instrument Serif) pour les titres, `.cap` pour les
  légendes. Textes en français.
- Mobile d'abord : tester à 375 px de large.
