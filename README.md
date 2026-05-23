# MindChallenger

MindChallenger est un jeu narratif de débat IA dans un tribunal intellectuel réalisé par Achahboun Wiam, Hivet Océan et Lamloum Lyna.

Tu incarnes un Aspirant-Orateur convoqué à la Cour d'Aster. Tu choisis un adversaire, tu défends une position sur un sujet philosophique ou de société, et la juge Éléonore Moreau rend un verdict argumenté avec une fiche de progression personnalisée.

L'histoire suit les traces de Vesper — le plus brillant Orateur de la Cour, disparu l'An 7 sans explication.

---

## Prérequis

- [Node.js ≥ 20](https://nodejs.org)
- Une clé API Anthropic → [console.anthropic.com](https://console.anthropic.com)

---

## Lancement

### Windows — en un clic

Double-clique sur **`Lancer-MindChallenger.bat`**.

Le script vérifie Node.js, te demande ta clé API Anthropic (une seule fois, puis sauvegardée dans `.env.local`), lance le serveur et ouvre le jeu dans le navigateur.

### Manuel (tous systèmes)

```bash
cd MindChallenger
cp .env.example .env.local
# Ouvrir .env.local et remplir ANTHROPIC_API_KEY=sk-ant-...
node server.js
```

Puis ouvrir [http://localhost:5173](http://localhost:5173).

---

## Structure du projet

```
MindChallenger/
├── server.js                  # Serveur HTTP + appels à l'API Claude
├── package.json               # Métadonnées (aucune dépendance npm)
├── .env.example               # Modèle de configuration
├── .env.local                 # Clé API (à créer, jamais commitée)
├── .gitignore
├── Lancer-MindChallenger.bat  # Lanceur Windows en un clic
├── public/
│   ├── index.html
│   └── src/
│       ├── app.js             # Interface complète (vanilla JS)
│       └── styles.css         # Design (ambiance tribunal)
│   └── assets/
│       ├── characters/        # Portraits des adversaires et de la juge
│       ├── players/           # Avatars joueurs
│       └── backgrounds/       # Fonds de scène par chapitre
└── docs/
    ├── API_SETUP.md           # Guide de configuration de la clé API
    ├── ARCHITECTURE.md        # Rôle détaillé de chaque fichier
    └── PROMPTS_IA.md          # Comportement demandé à l'IA
```

---

## Fonctionnalités

**Modes de jeu**
- Débat libre — choix du sujet, de l'adversaire et du niveau
- Sujet surprise — la Cour choisit pour toi
- Mode Histoire — quatre chapitres narratifs + épilogue

**Histoire**
- Prologue : arrivée à Aster en train, rencontre avec la juge Moreau, découverte de la statue brisée de Vesper
- Chapitre I — Nora Belkacem : *Faut-il toujours dire la vérité, même lorsqu'elle fait souffrir ?* (réf. Antigone / Sophocle)
- Chapitre II — Marc Varenne : *Faut-il laisser une trace de son existence ?* (réf. L'Ecclésiaste, Camus / Sisyphe)
- Chapitre III — Adrienne Valmont : *Les humains sont-ils vraiment capables d'être libres ?* (réf. Rousseau, Tocqueville, Kant, Platon)
- Chapitre IV — Socrate : *Faut-il toujours remettre ses certitudes en question ?* (réf. Kierkegaard, Nietzsche, Socrate)
- Épilogue : le carnet complet de Vesper, le verdict de Moreau, la vraie leçon

**Outils**
- Carnet de débat : historique des parties, fiches de progression, statistiques
- Grimoire : manuel du débatteur intégré (arguments, réfutation, biais, vocabulaire)
- Sauvegarde automatique en localStorage

---

## Personnages adversaires

| Personnage | Rôle dans le débat |
|---|---|
| Marc Varenne | Concret, cynique, demande des preuves et des chiffres |
| Nora Belkacem | Morale, combative, nomme les personnes affectées |
| Adrienne Valmont | Froide, précise, attaque les définitions floues |
| Socrate | Pose uniquement des questions, révèle les présupposés |

## Avatars joueurs

| Avatar | Titre |
|---|---|
| Aïssata Ndiaye | L'Oratrice engagée |
| Sebastian Kovács | Le Stratège méthodique |
| Yunseo Park | L'Analyste silencieux·se |

---

## Notes techniques

- **Aucune dépendance npm** : `server.js` utilise uniquement des modules natifs Node.js (`http`, `fs`, `path`, `url`).
- **Clé API protégée** : la clé n'est jamais exposée au navigateur. Elle transite uniquement côté serveur.
- **Frontend vanilla** : JavaScript pur, sans framework ni bundler.
- **Sources vérifiées** : l'IA ne peut citer que des sources du registre intégré à `server.js` (OCDE, OMS, ONU, Reuters Institute, Stanford HAI…).
