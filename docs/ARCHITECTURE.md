# Architecture du projet

## Fichiers à la racine de `MindChallenger/`

### `DEMARRAGE.txt`

Guide de lancement rapide en trois étapes, destiné à un utilisateur non-développeur. Ne contient pas de documentation technique.

### `README.md`

Documentation complète du projet : installation, structure, fonctionnalités, personnages, notes techniques. C'est le fichier principal pour GitHub et l'évaluation scolaire.

### `Lancer-MindChallenger.bat`

Script de lancement Windows. En un double-clic, il vérifie Node.js, demande la clé API Anthropic si absente, la sauvegarde dans `.env.local`, lance le serveur et ouvre le navigateur.

### `server.js`

Serveur HTTP Node.js. Il fait deux choses :

- Sert les fichiers statiques du dossier `public/` (HTML, CSS, JS, images).
- Reçoit les appels de l'interface (`/api/debate/respond`, `/api/debate/verdict`, etc.) et les transmet à l'API Claude d'Anthropic.

La clé API n'est jamais exposée au navigateur — elle transite uniquement ici, côté serveur.

N'utilise aucune dépendance externe : uniquement des modules natifs Node.js (`http`, `fs`, `path`, `url`).

### `package.json`

Métadonnées du projet. Contient les commandes utiles :

```bash
node server.js                                              # lancer le serveur
node --check server.js && node --check public/src/app.js   # vérifier la syntaxe
```

Pas de dépendances npm à installer.

### `.env.example`

Modèle de configuration. À copier en `.env.local` et compléter avec la vraie clé API.

### `.env.local` *(créé au premier lancement)*

Fichier privé contenant la clé API Anthropic. Ignoré par Git (voir `.gitignore`).

### `.gitignore`

Exclut du dépôt : `.env.local`, `node_modules/`, fichiers système (`.DS_Store`, `Thumbs.db`), fichiers éditeurs (`.vscode/`, `.idea/`).

---

## Dossier `public/`

### `index.html`

Page HTML unique servie à `http://localhost:5173`. Charge `styles.css` et `app.js`.

### `src/app.js`

Toute la logique de l'interface — environ 1300 lignes de JavaScript vanilla (sans framework) :

- Écrans : prologue, sélection du personnage, menu, configuration du débat, débat, verdict, carnet, grimoire, carnet de Vesper, épilogue.
- Personnages, avatars, chapitres, épilogue, blagues du ticker.
- Appels API vers le serveur local.
- Sauvegarde et chargement de la progression en `localStorage`.
- Transitions du carnet de Vesper.

### `src/styles.css`

Design complet : ambiance tribunal, typographie Cinzel/Cormorant Garamond, portraits, dialogues, animations, responsive.

---

## Dossier `public/assets/`

### `backgrounds/`

Fonds de scène affichés selon l'écran actif :

| Fichier | Utilisé pour |
|---|---|
| `tribunal.png` | Fond principal du mode débat |
| `prologue.png` | Hall de la Cour d'Aster (prologue + épilogue côté fond) |
| `chapter1.png` | Théâtre abandonné — Chapitre I (Nora) |
| `chapter2.png` | Archives souterraines — Chapitre II (Marc) |
| `chapter3.png` | Salle d'audience — Chapitre III (Adrienne) |
| `chapter4.png` | Salle souterraine de Socrate — Chapitre IV |
| `epilogue.png` | Valise et lettre — objet latéral de l'épilogue |
| `valise-lettre.png` | Statue de Vesper — objet latéral du prologue |

### `characters/`

Portraits PNG des adversaires et de la juge : `marc-varenne.png`, `adrienne-valmont.png`, `nora-belkacem.png`, `socrate.png`, `juge-moreau.png`.

### `players/`

Avatars PNG des trois protagonistes jouables : `aissata-ndiaye.png`, `sebastian-kovacs.png`, `yunseo-park.png`.

---

## Dossier `docs/`

### `ARCHITECTURE.md` *(ce fichier)*

Description du rôle de chaque fichier du projet.

### `API_SETUP.md`

Guide de configuration de la clé API Anthropic : lancement manuel, obtention de la clé, sécurité.

### `PROMPTS_IA.md`

Documentation du comportement demandé à l'IA : personnages, niveaux de difficulté, structure des réponses attendues, routes API.
