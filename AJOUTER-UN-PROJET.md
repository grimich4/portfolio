# Ajouter un projet

## Le plus simple : depuis Google Drive

(Configuration à faire une fois : voir `CONFIGURER-DRIVE.md`.)

Dans le dossier **Site** de ton Drive, un sous-dossier = un projet :

```
Site/
  01 Lisbonne/
  06 Venise/
    IMG_1234.HEIC
    IMG_1250.jpg
    projet          ← Google Doc facultatif
```

- Le **numéro** devant le nom fixe l'ordre sur l'accueil. Le reste donne le
  titre et l'adresse : `06 Venise` → « Venise », `/projets/venise`.
- Ajoute les photos comme tu veux : appli Drive sur téléphone, glisser-déposer
  sur l'ordi. Taille d'origine et HEIC acceptés.
- Le site se met à jour **dans l'heure**. Pour publier tout de suite : sur
  github.com/grimich4/portfolio, **Actions → Synchro Drive → Run workflow**.
- Supprimer une photo ou un dossier sur le Drive le retire aussi du site.
- Renommer un dossier change son titre et son ordre.

### Le Google Doc « projet » (facultatif)

Crée un Google Doc nommé **projet** dans le dossier, avec une info par ligne :

```
Titre : Venise
Lieu : Italie
Année : 2026
Texte : Une phrase de présentation.
Couleurs : #0b0b0b #f3f1ec
Couverture ordi : IMG_1234
Couverture téléphone : IMG_1250
```

- **Couleurs** : fond puis texte. **Si tu n'en mets pas, elles sont choisies
  automatiquement d'après l'ambiance des photos** (luminosité, teintes
  dominantes), avec toujours un texte bien lisible. Écrire `Couleurs : auto`
  revient au même.
- **Couverture ordi** : une photo **paysage**. **Couverture téléphone** : une
  photo **portrait**. Le nom du fichier suffit, sans extension. Si tu n'en mets
  pas, le site prend la première photo du bon format.
- **Ordre** (facultatif) : `Ordre : IMG_3, IMG_1, IMG_2` pour imposer un ordre.
  Sinon, les photos sont classées par nom de fichier.

Les lignes sont toutes facultatives.

## La série Paris (onglet « Paris »)

Dans **Site**, crée un dossier nommé exactement **Paris** (sans numéro). Chaque
sous-dossier = un arrondissement ; le **numéro** devant le nom est
l'arrondissement (1 à 20) :

```
Site/
  Paris/
    projet            ← Google Doc facultatif : titre et texte de la série
    11 Oberkampf/     ← 11e arrondissement → /paris/11e
      IMG_0001.HEIC
      projet          ← Google Doc facultatif
    18/               ← sans nom : titre « Butte-Montmartre » par défaut
```

- L'arrondissement apparaît sur la carte dès qu'il a au moins une photo : sa
  couverture s'affiche en fondu dans ses limites, en couleur au survol. Les
  autres restent « à venir ».
- Un seul dossier par arrondissement.
- Le Google Doc **projet** d'un arrondissement accepte les mêmes lignes que
  pour un projet, plus :

  ```
  Support : Polaroid
  Quartier : Oberkampf
  ```

  Le **support** (Polaroid, argentique, numérique, Instax, sténopé…) s'affiche
  sur la carte, dans l'index et sur la page de l'arrondissement.
  La **couverture ordi** est aussi celle de la carte.
- Le Google Doc **projet** placé directement dans **Paris/** règle la série :
  `Titre : …`, `Texte : …`, `Couleurs : #fond #texte` (par défaut : pierre de
  Paris et zinc).

## Autre méthode : directement sur GitHub

Un dossier dans `public/projets/` (par exemple `06-venise/`) avec les photos et
un `projet.json` facultatif :

```json
{
  "titre": "Venise",
  "lieu": "Italie",
  "annee": "2026",
  "couleurs": ["#0b0b0b", "#f3f1ec"],
  "couverture": { "ordi": "IMG_1234.jpg", "telephone": "IMG_1250.jpg" }
}
```

Envoi : github.com → `public/projets` → **Add file → Upload files**, depuis le
navigateur, sur l'ordi comme sur le téléphone. Les photos sont optimisées
automatiquement après l'envoi.

Un projet ajouté ainsi n'est jamais touché par la synchro Drive. S'il porte
le même nom qu'un dossier du Drive, c'est la version GitHub qui reste.

## Projets d'exemple

Les projets avec `"exemples"` dans leur `projet.json` utilisent des images
temporaires. Supprime leur dossier dans `public/projets/` quand tu n'en as
plus besoin.
