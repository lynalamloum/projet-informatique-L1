# Configurer l'IA dans MindChallenger

MindChallenger utilise l'API Anthropic (Claude) pour générer les réponses du débat.

## Lancement en un clic (Windows)

Double-clique sur `Lancer-MindChallenger.bat`. Il te demandera ta clé la première fois et la sauvegardera automatiquement.

## Configuration manuelle

1. Copie `.env.example` en `.env.local` dans le dossier `MindChallenger/`.
2. Remplis ta clé :

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-ta-cle-ici
ANTHROPIC_MODEL=claude-sonnet-4-5
PORT=5173
```

3. Lance le serveur :

```bash
node server.js
```

4. Ouvre `http://localhost:5173` dans ton navigateur.

## Obtenir une clé API

Rends-toi sur [console.anthropic.com](https://console.anthropic.com), crée un compte et génère une clé API. Elle commence par `sk-ant-`.

## Rôle de l'IA

L'IA génère uniquement :

- les réponses de l'adversaire pendant le débat ;
- le verdict de la juge ;
- la fiche de progression finale ;
- les sujets de débat (en option).

Tout le reste (interface, personnages, sauvegarde, sources) est local et ne dépend pas de l'IA.

## Sécurité

Ne commit jamais `.env.local` sur GitHub. Ce fichier est déjà dans `.gitignore`.  
Si tu as partagé une clé par erreur, révoque-la immédiatement sur [console.anthropic.com](https://console.anthropic.com).
