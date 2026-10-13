# Ajouter un projet

Un projet = un dossier dans `public/projets/`, avec ses photos et un petit
fichier `projet.json`. Le numéro devant le nom fixe l'ordre sur l'accueil :

```
public/projets/
  01-paris/
    projet.json
    IMG_0848.jpg
    IMG_2081.jpg
  02-littoral/
  …
```

Le nom du dossier sans le numéro devient l'adresse : `06-venise` → `/projets/venise`.

## projet.json

```json
{
  "titre": "Venise",
  "lieu": "Italie",
  "annee": "2026",
  "texte": "Une phrase de présentation (facultatif).",
  "couleurs": ["#0b0b0b", "#f3f1ec"],
  "couverture": {
    "ordi": "IMG_1234.jpg",
    "telephone": "IMG_1250.jpg"
  }
}
```

- `couleurs` : [fond, texte].
- `couverture.ordi` : une photo **paysage**, utilisée sur ordinateur.
- `couverture.telephone` : une photo **portrait**, utilisée sur téléphone.
  Si tu n'en mets pas, le site prend la première photo paysage ou portrait.
- `ordre` (facultatif) : `["IMG_3.jpg", "IMG_1.jpg"]` pour imposer un ordre.
  Sinon, les photos sont classées par nom de fichier.
- `exemples` : nombre d'images temporaires. À supprimer quand le projet a
  ses vraies photos.

## Envoyer les photos

Les photos peuvent être envoyées en taille d'origine. Après chaque envoi,
GitHub les redimensionne automatiquement à 3000 px, applique la bonne
rotation et retire les métadonnées, dont la position GPS. Vercel publie le
site environ une minute plus tard.

### Depuis l'ordinateur
1. Va sur github.com/grimich4/portfolio, puis ouvre `public/projets`.
2. **Add file → Create new file**. Dans le nom, tape `06-venise/projet.json`
   (le `/` crée le dossier), colle le modèle ci-dessus, puis **Commit**.
3. Ouvre le dossier `06-venise`, clique **Add file → Upload files**, glisse
   les photos, puis **Commit**.

### Depuis le téléphone
Même chose dans le navigateur, sur github.com (pas dans l'app GitHub, qui ne
permet pas l'envoi). Si le bouton **Upload files** n'apparaît pas, active
« Version pour ordinateur » dans le navigateur. Dans le sélecteur, choisis
**Photothèque**.

iPhone : l'envoi depuis Safari convertit les photos en JPEG. Les fichiers
`.heic` envoyés autrement ne sont pas pris en charge.

### Modifier ou retirer
- Changer un texte, une couleur ou une couverture : ouvre `projet.json`,
  clique sur le crayon ✎, modifie, puis **Commit**.
- Retirer une photo : ouvre-la sur GitHub, menu **…** → **Delete file**.
- Changer l'ordre des projets : renomme le dossier (`06-venise` → `02-venise`).
