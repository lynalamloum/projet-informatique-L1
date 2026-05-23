# Prompts et comportement de l'IA

Le comportement de l'IA est défini dans `server.js`.

## Route `/api/debate/respond`

Cette route génère les réponses de l'adversaire.

L'IA reçoit :

- le sujet exact ;
- le camp de l'utilisateur ;
- le camp adverse ;
- le personnage choisi ;
- la difficulté ;
- l'historique du débat ;
- le dernier message utilisateur ;
- les sources autorisées ;
- les notes de mémoire.

Elle doit répondre en JSON strict avec :

- `reply` : réponse naturelle du personnage ;
- `sources` : sources fiables autorisées utilisées ;
- `questionToUser` : question finale qui relance le débat ;
- `strategyUsed` : stratégie rhétorique utilisée ;
- `memoryNotes` : éléments à retenir pour la suite.

## Personnages

### Marc Varenne — journaliste cynique

Il est concret, ironique, rapide. Il demande : qui paie, qui applique, quels effets pervers, quels cas limites ?

### Adrienne Valmont — intellectuelle arrogante

Elle est froide, précise, exigeante. Elle attaque les définitions floues, les contradictions et les changements de critère.

### Nora Belkacem — avocate militante

Elle est intense, morale, combative. Elle utilise les conséquences humaines, les injustices et les cas concrets.

### Socrate

Il pose surtout des questions. Il révèle les présupposés et oblige l'utilisateur à définir ses mots.

## Difficultés

### Facile

L'adversaire est bienveillant, explique davantage, pose des objections simples et concède plus facilement.

### Moyen

L'adversaire débat normalement, demande des preuves et repère les imprécisions évidentes.

### Difficile

L'adversaire attaque la logique, utilise des sources pertinentes et revient sur les contradictions.

### Expert

L'adversaire est stratégique, exploite l'historique, impose des dilemmes et ne laisse pas passer les généralités.

## Route `/api/debate/verdict`

La juge finale tranche selon :

- clarté de la thèse ;
- définitions ;
- logique ;
- preuves ;
- réponses aux objections ;
- nuance ;
- persuasion ;
- usage des sources.

Elle ne doit jamais inventer un argument absent du débat.

## Route `/api/debate/final-report`

La fiche finale doit être personnalisée et utile. Elle contient :

- résumé du débat ;
- points forts ;
- faiblesses ;
- réponses modèles ;
- arguments manquants ;
- vocabulaire utile ;
- phrases rhétoriques ;
- sources à revoir.

Aucun conseil générique n'est autorisé.
