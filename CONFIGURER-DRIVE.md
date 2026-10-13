# Relier le Google Drive au site (à faire une seule fois)

Le site récupère toutes les heures les photos d'un dossier « Site » de ton
Drive. Il le fait avec un **compte de service**, un compte Google technique
qui ne peut lire que ce que tu partages avec lui, et seulement en lecture.

## 1. Créer le compte de service (Google Cloud, ~5 min)

1. Va sur https://console.cloud.google.com avec ton compte Google.
2. En haut, sélecteur de projet → **Nouveau projet** → nom : `portfolio` → **Créer**.
3. Menu ☰ → **API et services → Bibliothèque** → cherche **Google Drive API**
   → **Activer**.
4. Menu ☰ → **IAM et administration → Comptes de service** →
   **Créer un compte de service** → nom : `site-photos` → **Créer et continuer**
   → ne donne aucun rôle → **OK**.
5. Clique sur le compte créé → onglet **Clés** → **Ajouter une clé →
   Créer une clé → JSON**. Un fichier `.json` se télécharge : c'est la clé,
   garde-la pour toi.
6. Note l'adresse du compte, du type
   `site-photos@portfolio-xxxxx.iam.gserviceaccount.com`.

## 2. Préparer le Drive

1. Crée un dossier **Site** dans ton Drive.
2. Clic droit → **Partager** → colle l'adresse du compte de service →
   rôle **Lecteur** → décoche « Envoyer une notification » → **Partager**.
3. Ouvre le dossier. L'adresse se termine par
   `/folders/1AbCdEf…` : la partie après `/folders/` est l'**identifiant**.

## 3. Donner les clés à GitHub

Sur github.com/grimich4/portfolio → **Settings → Secrets and variables →
Actions → New repository secret**, crée deux secrets :

| Nom | Valeur |
| --- | --- |
| `GDRIVE_KEY` | tout le contenu du fichier `.json` téléchargé |
| `GDRIVE_FOLDER` | l'identifiant du dossier Site |

Ensuite, **Actions → Synchro Drive → Run workflow** pour un premier essai.
Le site est en ligne environ une minute après.

Les secrets ne sont lisibles par personne, toi compris, une fois enregistrés.
Pour couper la synchro, supprime-les ou retire le partage du dossier.
