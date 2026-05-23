
const SCRIPT_URL = document.currentScript?.src || location.href;
const ASSET_BASE = new URL('../', SCRIPT_URL).href;
const BG = {
  tribunal: `${ASSET_BASE}assets/backgrounds/tribunal.png`,
  prologue: `${ASSET_BASE}assets/backgrounds/prologue.png`,
  chapter1: `${ASSET_BASE}assets/backgrounds/chapter1.png`,
  chapter2: `${ASSET_BASE}assets/backgrounds/chapter2.png`,
  chapter3: `${ASSET_BASE}assets/backgrounds/chapter3.png`,
  chapter4: `${ASSET_BASE}assets/backgrounds/chapter4.png`,
  epilogue: `${ASSET_BASE}assets/backgrounds/epilogue.png`,
  letter: `${ASSET_BASE}assets/backgrounds/valise-lettre.png`
};
const DEFAULT_PROVIDER = 'anthropic';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const DEFAULT_OPENROUTER_MODEL = 'deepseek/deepseek-chat:free';
const API_PROVIDER_STORAGE_KEY = 'mindchallenger_ai_provider';
const GEMINI_KEY_STORAGE_KEY = 'mindchallenger_gemini_key';
const GEMINI_MODEL_STORAGE_KEY = 'mindchallenger_gemini_model';
const OPENAI_KEY_STORAGE_KEY = 'mindchallenger_openai_key';
const OPENAI_MODEL_STORAGE_KEY = 'mindchallenger_openai_model';
const OPENROUTER_KEY_STORAGE_KEY = 'mindchallenger_openrouter_key';
const OPENROUTER_MODEL_STORAGE_KEY = 'mindchallenger_openrouter_model';

const API = {
  async post(path, body) {
    // 1) Si l'app est servie par le serveur local, on utilise le backend sécurisé.
    if (location.protocol !== 'file:') {
      try {
        const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json().catch(()=>({message:'Erreur'}))).message || 'Erreur API');
        return res.json();
      } catch (serverError) {
        // 2) Si le serveur ne répond pas correctement, on tente le mode index.html direct.
        if (!getStoredApiKey()) throw serverError;
      }
    }
    // 3) Mode index.html direct : l'utilisateur entre sa clé dans l'interface.
    return directLLM(path, body);
  }
};

const CHARACTERS = {
  journalist: {
    name: 'Marc Varenne', role: 'Ancien historien de la Cour', gender: 'Homme',
    portrait: `${ASSET_BASE}assets/characters/marc-varenne.png`, accent: '#d9a857',
    quote: '« Très bien. Maintenant, concrètement, ça marche comment ? »',
    desc: 'Sarcastique, direct, impatient avec les grandes idées vides. Marc attaque toujours au même endroit : les conséquences réelles. Il veut des chiffres, des exemples, des cas documentés. Si ton argument oublie ce qui se passe dans la vraie vie, il le démonte phrase par phrase.',
    teaches: ['Ancrer dans le concret', 'Anticiper les effets pervers', 'Répondre sous pression'],
  },
  lawyer: {
    name: 'Nora Belkacem', role: 'Oratrice du port d’Aster', gender: 'Femme',
    portrait: `${ASSET_BASE}assets/characters/nora-belkacem.png`, accent: '#c94b4b',
    quote: '« Derrière ton raisonnement, il y a des gens réels. »',
    desc: 'Intense, morale, combative. Nora nomme toujours les personnes concrètes affectées par ce dont tu parles. Elle construit en trois temps : injustice réelle, responsabilité, solution. Elle t’interpelle directement. Elle ne pardonne pas les arguments qui ignorent ceux qui subissent.',
    teaches: ['Plaider avec émotion', 'Relier logique et humain', 'Tenir face à l’abstraction'],
  },
  intellectual: {
    name: 'Adrienne Valmont', role: 'Directrice des Épreuves', gender: 'Femme',
    portrait: `${ASSET_BASE}assets/characters/adrienne-valmont.png`, accent: '#b86dff',
    quote: '« Tu utilises ce mot comme s’il était évident. Il ne l’est pas. »',
    desc: 'Froide, précise, méthodique. Adrienne commence toujours par reformuler ton argument pour en montrer la limite interne. Elle attaque les définitions floues, les contradictions, les glissements de sens. Ses phrases sont longues, construites, implacables. Elle concède rarement.',
    teaches: ['Définir les concepts', 'Démanteler les présupposés', 'Structurer un raisonnement'],
  },
  socrates: {
    name: 'Socrate', role: 'Dernier témoin de Vesper', gender: 'Homme',
    portrait: `${ASSET_BASE}assets/characters/socrate.png`, accent: '#6fb7ff',
    quote: '« Que veux-tu dire exactement par là ? »',
    desc: 'Il ne donne jamais son opinion. Il pose uniquement des questions — courtes, précises, qui repartent de tes propres mots. Il cible tes définitions, tes présupposés, tes contradictions. Pas d’arguments développés. Juste la question que tu ne voulais pas entendre.',
    teaches: ['Clarifier ses certitudes', 'Repérer ses présupposés', 'Tenir face au vide'],
  }
};
const JUDGE = {
  name: 'Juge Éléonore Moreau',
  portrait: `${ASSET_BASE}assets/characters/juge-moreau.png`,
  quote: '« Les guerres commencent bien avant les armes. Elles commencent quand plus personne n’accepte d’écouter. »'
};

const PLAYER_ARCHETYPES = {
  aissata: {
    id: 'aissata', defaultName: 'Aïssata', title: 'L’Oratrice engagée', pronoun: 'elle', initials: 'A',
    origins: 'Sénégal / France', palette: 'green', accent: '#6ee7a8',
    portrait: `${ASSET_BASE}assets/players/aissata-ndiaye.png`,
    quote: '« Une parole juste doit pouvoir tenir debout devant n’importe quel pouvoir. »',
    desc: 'Charismatique, directe et courageuse. Aïssata incarne une façon de débattre fondée sur l’impact, la justice et la force morale.',
    traits: ['Éloquence', 'Engagement', 'Impact']
  },
  sebastian: {
    id: 'sebastian', defaultName: 'Sebastian', title: 'Le Stratège méthodique', pronoun: 'il', initials: 'S',
    origins: 'Hongrie / Argentine', palette: 'red', accent: '#ff8a66',
    portrait: `${ASSET_BASE}assets/players/sebastian-kovacs.png`,
    quote: '« La vérité ne se crie pas. Elle se démontre. »',
    desc: 'Calme, précis et difficile à déstabiliser. Sebastian représente la logique, la stratégie et le contrôle dans les débats tendus.',
    traits: ['Logique', 'Contrôle', 'Stratégie']
  },
  yunseo: {
    id: 'yunseo', defaultName: 'Yunseo', title: 'L’Analyste silencieux·se', pronoun: 'iel', initials: 'Y',
    origins: 'Corée du Sud / Nouvelle-Zélande', palette: 'violet', accent: '#b995ff',
    portrait: `${ASSET_BASE}assets/players/yunseo-park.png`,
    quote: '« Les contradictions parlent souvent plus fort que les aveux. »',
    desc: 'Observateur·ice, nuancé·e et subtil·e. Yunseo incarne l’analyse psychologique, la patience et l’art de retourner une idée contre elle-même.',
    traits: ['Observation', 'Nuance', 'Analyse']
  }
};

const STORY_CHAPTERS = [
  {
    id: 'chapter1', chapter: 'Chapitre I', title: 'Le Port et l’Illusion',
    status: 'Disponible',
    topic: 'Faut-il toujours dire la vérité, même lorsqu’elle fait souffrir ?',
    character: 'lawyer', difficulty: 'easy',
    background: BG.chapter1,
    bias: 'Croire que protéger quelqu’un de la vérité est toujours un acte de bienveillance',
    vesper: '« Il voulait sauver les hommes de leurs mensonges. Il ne comprenait pas que certains vivent grâce à eux. » — Nora Belkacem',
    teaser: 'Première Épreuve. Nora Belkacem vit dans l’ancien théâtre du port. Elle défend Antigone contre Créon — la compassion contre la loi froide.',
    intro: `Nora Belkacem vit dans l’ancien théâtre du port d’Aster, qu’elle a transformé en permanence ouverte. Il y a des matelas dans les coulisses, une cuisine collective sur scène, des enfants qui jouent entre les bancs. Elle refuse d’habiter la Cour — elle dit que la Cour transforme les humains en machines à argumenter.

Dans le quartier des pêcheurs, il y a un vieil homme qu’on appelle Theo. Chaque soir depuis trois ans, il pose deux bols sur sa table, sort deux verres, et attend. Son fils s’appelait Elias. Il est mort pendant la dernière année de la guerre civile, dans un éboulement sur le port. Toute la ville le sait. Personne ne l’a dit à Theo, parce que le médecin a jugé qu’il ne le supporterait pas. Cette attente est la seule chose qui le fait encore manger.

Nora te montre Theo par la fenêtre du théâtre.

— Sophocle a écrit Antigone pour cette question, dit-elle. Créon a la loi. Antigone a sa conscience. Aucun des deux n’est un monstre. Créon essaie de tenir une cité. Antigone essaie d’honorer ce qu’elle aime. Ils ont tous les deux raison selon leur propre logique. Et la cité s’effondre quand même.

Elle s’éloigne de la fenêtre.

— Vesper voulait aller dire la vérité à Theo. Il pensait que c’était son droit. Je lui ai dit que si Theo mourait la semaine suivante, ce serait sur sa conscience. Il m’a répondu que la vérité n’avait pas de conscience. On a débattu toute la nuit. On n’a pas trouvé de réponse.

Elle se retourne.

— Alors toi : faut-il toujours dire la vérité, même lorsqu’elle fait souffrir ?`
  },
  {
    id: 'chapter2', chapter: 'Chapitre II', title: 'Les Archives et l’Oubli',
    status: 'Disponible',
    topic: 'Faut-il laisser une trace de son existence ?',
    character: 'journalist', difficulty: 'medium',
    background: BG.chapter2,
    bias: 'Croire que laisser une trace protège de la mort',
    vesper: '« Plus les hommes craignent l’oubli, plus ils deviennent capables de violence pour lui survivre. » — Carnet de Vesper',
    teaser: 'Deuxième Épreuve. Marc Varenne vit dans les archives souterraines. Il connaît l’Ecclésiaste par cœur. Vanité des vanités, tout est vanité.',
    intro: `La nuit précédente, quelqu’un a gravé sur la statue de Vesper dans le hall principal : « IL N’A RIEN SAUVÉ. » Les lettres sont profondes. Personne ne sait qui. Personne ne revendique.

Marc Varenne t’attendait déjà dans les archives souterraines. Il n’a pas commenté la statue. Il t’a juste ouvert la porte.

Les archives sont un labyrinthe — des salles qui s’enchâinent dans le noir, hautes comme des cathédrales, remplies de registres. Marc te montre une salle consacrée à des philosophes dont plus personne ne connaît le nom. Certains ont écrit cinquante volumes. Il en reste parfois une ligne dans un dictionnaire spécialisé. Une autre salle conserve les archives d’un empire de trois cent quarante ans et trente millions d’habitants. Quatre pages en tout.

— L’Ecclésiaste dit : vanité des vanités, tout est vanité. C’est le livre le plus honnête de l’histoire, dit Marc. Camus a écrit la même chose autrement : Sisyphe pousse son rocher et sait que ça ne sert à rien, et Camus dit qu’il faut l’imaginer heureux. Moi je ne sais pas si c’est du courage ou de la dénégation.

Il s’arrête devant une salle dont les murs sont noirs de suie. Les livres ont été brulés pendant la guerre. Il reste debout un moment sans rien dire.

— Vesper écrivait tout. Des carnets entiers. Il pensait que garder une trace donnait un sens à ce qu’on avait vécu. Vers la fin, ses carnets sont devenus de plus en plus courts. Certaines pages sont vides.

Il te regarde.

— Alors toi, tu penses qu’il faut laisser une trace ?`
  },
  {
    id: 'chapter3', chapter: 'Chapitre III', title: 'La Cité Libre et le Contrôle',
    status: 'Disponible',
    topic: 'Les humains sont-ils vraiment capables d’être libres ?',
    character: 'intellectual', difficulty: 'hard',
    background: BG.chapter3,
    bias: 'Confondre liberté souhaitée et liberté supportée',
    vesper: '« Adrienne savait tout définir, sauf le moment où le doute permanent empêche les hommes d’agir. » — Annotation non signée',
    teaser: 'Troisième Épreuve. Adrienne Valmont dirige les Épreuves. Elle a lu Platon, Rousseau et Tocqueville. Elle pose la même question depuis vingt ans.',
    intro: `Adrienne Valmont n’aime pas perdre du temps. Elle t’a donné rendez-vous dans la grande salle des archives juridiques et les documents étaient déjà étalés quand tu es arrivé.

Quinze ans après la guerre civile, une cité à l’est d’Aster a décidé de tout recommencer à zéro. Les habitants s’étaient réunis en assemblée et avaient voté : plus de lois, plus de dirigeants, plus de hiérarchie. Ils avaient lu Rousseau. Ils croyaient que la liberté naturelle de l’homme suffirait. Les six premiers mois se sont bien passés.

Ensuite les groupes se sont formés. Les plus forts ont pris le contrôle des réservoirs d’eau et des entrepôts. Des violences ont éclaté. Un an après le vote, les habitants ont élu un chef à la quasi-unanimité. Aujourd’hui la cité est calme et entièrement contrôlée.

— Tocqueville l’avait écrit, dit Adrienne. La démocratie produit naturellement une forme douce de tyrannie — pas par violence, mais parce que les gens délèguent volontiers leur liberté à quelqu’un qui leur promet la sécurité. Kant pense que la liberté est une capacité rationnelle que tous les humains possèdent en théorie. Platon dit que la plupart des gens, laissés seuls, choisissent la caverne.

Elle pose le doigt sur le rapport.

— Vesper avait lu ces documents. Il en avait conclu que les débats eux-mêmes étaient le problème — que le doute permanent empêchait les gens d’agir. Il voulait abolir les Épreuves. J’ai considéré ça comme sa plus grande erreur.

Elle te fixe.

— Alors : tu crois vraiment que les humains sont capables d’être libres ?`
  },
  {
    id: 'chapter4', chapter: 'Chapitre IV', title: 'La Dernière Question',
    status: 'Disponible',
    topic: 'Faut-il toujours remettre ses certitudes en question ?',
    character: 'socrates', difficulty: 'expert',
    background: BG.chapter4,
    bias: 'Croire que détruire ses certitudes suffit à être libre',
    vesper: '« Je pensais chercher la sortie. Socrate m’a demandé qui, en moi, voulait vraiment sortir. » — Dernière ligne connue de Vesper',
    teaser: 'Dernière Épreuve. Socrate vit sous la Cour. Il pratique l’elenchus — la réfutation par questionnement. Vesper n’a pas survécu au dernier cycle.',
    intro: `L’entrée est au bout d’un couloir que la plupart des gens à la Cour font semblant de ne pas voir. Tu descends un escalier en colimaçon dans le noir, tu pousses une porte en bois, et tu débouches dans une grande pièce souterraine.

Les murs sont couverts de feuilles. Des centaines. Certaines sont écrites très serré, d’autres n’ont qu’un mot et un point d’interrogation. Beaucoup sont barrées, raturées, réécrites. Tu reconnais l’écriture de Vesper.

Socrate est assis à une petite table au centre. Une bougie, deux verres vides, un livre ouvert qu’il ne lisait pas. Il ne se lève pas quand tu entres.

— Il venait ici tous les soirs, dit-il. Au début pour débattre. Ensuite pour poser des questions. Ensuite pour relire ce qu’il avait écrit, comme s’il cherchait une phrase qu’il avait manquée.

Il te regarde.

— Kierkegaard disait qu’on ne peut pas raisonner sur tout — qu’à un moment il faut choisir, et que ce choix ne se justifie pas entièrement. Nietzsche a dit que les certitudes morales étaient des illusions héritées, des chaînes qu’on appelle valeurs. Socrate lui-même — le vrai, pas moi — a été condamné à mort parce qu’il posait des questions que la cité ne supportait plus.

Il ferme le livre.

— La dernière chose que Vesper m’a dite avant de disparaître, c’était : « Que reste-t-il à un homme quand il a démonté toutes ses certitudes ? » Il ne posait plus la question comme un exercice. Il la posait pour lui.

Un silence.

— Moi je te pose une question différente : faut-il toujours le faire ?`
  }
];
const STORY_EPILOGUE = {
  title: 'Épilogue — Le Carnet de Vesper',
  subtitle: 'Après les Épreuves',
  background: BG.epilogue,
  text: `Tu ressors de la salle de Socrate et tu remontes seul vers le hall principal.

La statue de Vesper est là, dans le demi-jour. Elle est immense et abimée — une partie du visage manque depuis que quelqu’un l’a brisée pendant la guerre. La Cour a décidé de ne pas la réparer. Sur le socle, tu relis les mots gravés : « Celui qui voulut libérer les hommes de leurs illusions. »

La juge Moreau est assise sur les marches qui mènent à la statue. Elle ne t’a pas attendu comme une juge. Elle est là comme quelqu’un qui revient souvent à cet endroit. Elle te tend un carnet sans rien dire. Il est abîmé, les coins sont écornés, certaines pages gondolent comme si elles avaient été mouillées puis séchées.

— Il te ressemblait, dit-elle enfin. Pas dans le caractère. Dans la façon de ne pas vouloir s’arrêter.

Tu feuillettes le carnet. Les premières pages sont des notes de débat, structurées, argumentées, avec des références. Les dernières sont autre chose. Des phrases courtes. Des mots seuls.

Moreau parle sans te regarder.

— Son erreur n’était pas de vouloir la vérité. Son erreur était de croire que la trouver suffisait. Qu’en démontant assez d’illusions, il resterait quelque chose de pur. Mais il n’y a pas de fond. Il y a juste la façon dont on continue à vivre avec ce qu’on ne peut pas résoudre.

Elle se lève.

— Le vrai courage n’est pas de tout remettre en question. C’est de savoir ce que tu choisis de garder, et pourquoi. Pas parce que c’est confortable. Parce que tu en as décidé.

Elle s’arrête avant de partir.

— Vesper a cherché une vérité qui ne dépendrait de personne. Il n’a pas compris que penser, c’est toujours penser avec les autres — même quand on les contredit. Surtout quand on les contredit.

La dernière page du carnet n’a qu’une phrase : « J’aurais dû demander non pas ce en quoi croire, mais avec qui continuer à chercher. »`,
  closing: 'Douter n’est pas une faiblesse. C’est refuser de laisser quelqu’un d’autre penser à ta place.'
};
const DIFFICULTIES = {
  easy: { label: 'Facile', detail: 'Bienveillant, explique ses objections, concède plus facilement.', heat: 25 },
  medium: { label: 'Moyen', detail: 'Solide, demande des preuves et repère les imprécisions évidentes.', heat: 50 },
  hard: { label: 'Difficile', detail: 'Attaque la logique, utilise les sources, revient sur tes contradictions.', heat: 75 },
  expert: { label: 'Expert', detail: 'Implacable, stratégique, exploite l’historique et ne laisse rien passer.', heat: 100 },
};

const THEMES = ['Éducation','Société','Politique','Économie','Technologie','Environnement','Éthique','Culture','Philosophie','Actualité','Justice'];


const GRIMOIRE_PAGES = [
  {
    title: 'I. La règle d’or du débat',
    subtitle: 'Ne cherche pas seulement à gagner : cherche à rendre ton idée impossible à ignorer.',
    body: `Un bon débatteur ne parle pas pour remplir le silence. Il parle pour déplacer le centre du débat.

Avant chaque réponse, demande-toi : quelle est exactement la thèse adverse ? Quelle partie est vraie ? Quelle partie est fragile ? Quelle preuve manque ?

La règle fondamentale est simple : une affirmation sans preuve est une opinion ; une preuve sans lien logique est un décor ; un lien logique sans clarté est une confusion. Un argument fort réunit les trois : thèse, preuve, conséquence.`
  },
  {
    title: 'II. Construire un argument solide',
    subtitle: 'La structure invisible d’une phrase convaincante.',
    body: `Un argument complet contient cinq éléments :

1. La thèse : ce que tu défends.
2. La raison : pourquoi tu le défends.
3. La preuve : l’exemple, la donnée, l’étude ou le fait.
4. Le lien logique : pourquoi la preuve soutient réellement la thèse.
5. L’impact : ce que cela change dans le débat.

Formule utile : « Je défends X, parce que Y. On le voit avec Z. Donc la vraie conséquence est W. »`
  },
  {
    title: 'III. Réfuter sans seulement nier',
    subtitle: 'Une réfutation n’est pas un “non”. C’est une opération chirurgicale.',
    body: `Pour réfuter efficacement, vise précisément le point faible :

— la définition est floue ;
— la preuve est insuffisante ;
— la causalité est douteuse ;
— le contre-exemple est ignoré ;
— la conséquence est exagérée ;
— le raisonnement change de critère en cours de route.

Formule utile : « Ton argument serait valable si…, mais il suppose que…, or… »`
  },
  {
    title: 'IV. Les concessions stratégiques',
    subtitle: 'Accorder un point peut rendre ton argument plus fort.',
    body: `Un débatteur faible refuse tout. Un débatteur fort sait concéder sans céder.

Exemple : « Je t’accorde que certains devoirs peuvent être utiles. Mais ce que je critique, ce sont les devoirs longs, mécaniques et inégalitaires. »

La concession montre que tu comprends la complexité. Elle empêche l’adversaire de te caricaturer et te permet de recentrer le débat sur ton vrai terrain.`
  },
  {
    title: 'V. Les biais les plus dangereux',
    subtitle: 'Les biais de la Cour d’Aster sont aussi dans nos raisonnements.',
    body: `Les biais les plus fréquents :

— Confondre émotion et vérité : une souffrance est réelle, mais elle ne prouve pas toujours une conclusion.
— Confondre récit et réalité : une histoire cohérente n’est pas forcément exacte.
— Confondre savoir et compréhension : connaître des concepts ne suffit pas à comprendre les humains.
— Croire qu’on n’a plus de biais : la lucidité commence quand on accepte d’en avoir encore.

Le meilleur débatteur ne supprime pas ses biais. Il apprend à les repérer avant qu’ils ne parlent à sa place. C’est l’erreur que Vesper a comprise trop tard : croire qu’on voit clair peut devenir le biais le plus dangereux.`
  },
  {
    title: 'VI. Vocabulaire essentiel',
    subtitle: 'Les mots qui permettent de penser plus précisément.',
    body: `Présupposé : idée admise sans être démontrée.
Charge de la preuve : obligation de prouver ce qu’on affirme.
Contre-exemple : cas précis qui fragilise une généralisation.
Causalité : lien réel entre une cause et un effet.
Corrélation : deux phénomènes qui évoluent ensemble sans que l’un cause forcément l’autre.
Effet pervers : conséquence négative inattendue d’une mesure bien intentionnée.
Nuance : capacité à distinguer les cas au lieu de tout traiter en bloc.
Critère de jugement : valeur utilisée pour trancher : justice, efficacité, liberté, sécurité, bien-être.`
  },
  {
    title: 'VII. Phrases puissantes à réutiliser',
    subtitle: 'Des armes rhétoriques propres.',
    body: `« Le vrai désaccord porte moins sur X que sur Y. »
« Votre argument suppose implicitement que… »
« Je vous accorde ce point, mais il ne suffit pas à conclure que… »
« Il faut distinguer le principe et son application. »
« Cette objection serait forte si…, mais elle oublie… »
« Avant de trancher, il faut choisir le critère : efficacité, justice ou liberté ? »
« Ce n’est pas parce qu’un cas existe qu’il représente la règle générale. »`
  },
  {
    title: 'VIII. Devenir excellent',
    subtitle: 'La progression d’un vrai débatteur.',
    body: `Pour devenir très fort, travaille quatre réflexes :

1. Définir les mots importants avant que l’adversaire ne les utilise contre toi.
2. Chercher l’objection la plus forte à ta propre position.
3. Utiliser des exemples précis plutôt que des généralités.
4. Terminer chaque réponse par une pression argumentative : une question, un dilemme, un critère de décision.

Le but n’est pas de parler plus fort. Le but est de rendre ta position plus difficile à attaquer à chaque phrase.`
  }
];

const LOCAL_TOPICS = {
  'Éducation': [
    'Les devoirs à la maison sont-ils contre-productifs ?',
    'Les notes devraient-elles être supprimées ?',
    'L’école en ligne peut-elle remplacer l’école traditionnelle ?',
    'L’école devrait-elle commencer plus tard le matin ?',
    'Faut-il rendre l’uniforme obligatoire à l’école ?',
    'L’université devrait-elle être gratuite pour tous ?'
  ],
  'Société': [
    'Les réseaux sociaux abîment-ils le débat démocratique ?',
    'Faut-il interdire les réseaux sociaux aux moins de 16 ans ?',
    'Le télétravail devrait-il devenir un droit ?',
    'La société valorise-t-elle trop la réussite professionnelle ?',
    'Les jeunes générations sont-elles vraiment moins résilientes ?',
    'Faut-il limiter la place des voitures dans les centres-villes ?'
  ],
  'Politique': [
    'La démocratie directe est-elle préférable à la démocratie représentative ?',
    'Faut-il limiter davantage les mandats politiques ?',
    'L’État doit-il réguler plus fortement les grandes plateformes ?',
    'Le vote devrait-il être obligatoire ?',
    'Les citoyens devraient-ils pouvoir révoquer leurs élus ?',
    'La liberté d’expression doit-elle avoir plus de limites en ligne ?'
  ],
  'Économie': [
    'La semaine de 4 jours améliore-t-elle vraiment la productivité ?',
    'Les riches devraient-ils payer beaucoup plus d’impôts ?',
    'Le capitalisme est-il encore le meilleur système économique possible ?',
    'Le revenu universel est-il une solution crédible ?',
    'La mondialisation a-t-elle appauvri les classes moyennes occidentales ?',
    'Les cryptomonnaies peuvent-elles remplacer les monnaies traditionnelles ?'
  ],
  'Technologie': [
    'L’intelligence artificielle va-t-elle remplacer les professeurs ?',
    'Les smartphones nous rendent-ils moins attentifs ?',
    'Faut-il réguler fortement l’IA générative ?',
    'Les algorithmes devraient-ils être audités par l’État ?',
    'La reconnaissance faciale devrait-elle être interdite dans l’espace public ?',
    'Les jeux vidéo peuvent-ils être considérés comme un art majeur ?'
  ],
  'Environnement': [
    'La décroissance est-elle nécessaire face au changement climatique ?',
    'Le nucléaire est-il indispensable à la transition énergétique ?',
    'Faut-il interdire les vols courts quand le train existe ?',
    'Le véganisme est-il nécessaire pour réduire l’impact écologique ?',
    'Les individus sont-ils plus responsables du climat que les entreprises ?',
    'Faut-il taxer davantage les produits très polluants ?'
  ],
  'Éthique': [
    'Le mensonge peut-il être moralement justifié ?',
    'La surveillance de masse est-elle acceptable pour la sécurité ?',
    'Les animaux devraient-ils avoir des droits juridiques ?',
    'L’euthanasie devrait-elle être légalisée partout ?',
    'La peine de mort peut-elle être moralement défendue ?',
    'Peut-on sacrifier une liberté individuelle au nom du bien commun ?'
  ],
  'Culture': [
    'Les œuvres doivent-elles être séparées de la vie de leurs auteurs ?',
    'La culture populaire vaut-elle autant que la culture classique ?',
    'Les plateformes de streaming appauvrissent-elles la création culturelle ?',
    'Les musées devraient-ils être gratuits pour tous ?',
    'La censure artistique peut-elle être justifiée ?',
    'Les influenceurs ont-ils remplacé les critiques culturels ?'
  ],
  'Philosophie': [
    'La liberté existe-t-elle vraiment si nos choix sont déterminés ?',
    'La recherche du bonheur est-elle un bon but de vie ?',
    'La vérité est-elle toujours préférable à l’illusion ?',
    'Peut-on être juste sans être impartial ?',
    'La technique rend-elle l’être humain plus libre ?',
    'Faut-il toujours obéir à sa conscience ?'
  ],
  'Actualité': [
    'Les médias d’information renforcent-ils la polarisation ?',
    'Les États doivent-ils limiter l’usage des IA génératives ?',
    'La désinformation est-elle la plus grande menace pour les démocraties ?',
    'Les boycotts citoyens sont-ils efficaces ?',
    'Les entreprises devraient-elles prendre position sur les sujets politiques ?',
    'Les réseaux sociaux devraient-ils vérifier l’âge de tous les utilisateurs ?'
  ],
  'Justice': [
    'La prison permet-elle réellement de réinsérer ?',
    'Les peines doivent-elles être plus sévères pour dissuader ?',
    'La justice prédictive par algorithme est-elle dangereuse ?',
    'Faut-il juger différemment les mineurs et les adultes ?',
    'La justice doit-elle privilégier la réparation plutôt que la punition ?',
    'Les procès médiatisés nuisent-ils à l’impartialité de la justice ?'
  ],
};

let localTopicOffset = 0;
let lastRenderedScreen = null;

const SAVE_KEY = 'mindchallenger_save_v3';

function defaultSave(){
  return {
    introSeen: false,
    player: { archetype: null, name: '' },
    debates: [],
    reports: [],
    stats: { played: 0, wins: 0, draws: 0, losses: 0, skills: { logique: 0, sources: 0, refutation: 0, nuance: 0, persuasion: 0 } },
    story: { unlocked: ['chapter1'], completed: [] }
  };
}
function loadSave(){
  try { return { ...defaultSave(), ...(JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')) }; }
  catch { return defaultSave(); }
}

const VESPER_CARNET = [
  {
    title: 'I. Après le port', subtitle: 'Note de Vesper — Chapitre I',
    body: `J’ai débattu avec Nora ce soir. Elle est partie avant qu’on ait fini. Ce n’est pas la première fois.

Elle m’a montré Theo par la fenêtre. J’ai dit que lui mentir était une forme de mépris — qu’on lui volait le droit de faire son deuil. Elle a répondu que j’avais raison sur le principe et tort sur lui spécifiquement. Que le principe ne protège personne.

Je crois toujours que la vérité est préférable au mensonge. Mais je ne sais pas répondre à sa question : préférable pour qui ? Si c’est moi qui décide à la place de Theo ce qui est préférable pour lui, est-ce que je suis encore du côté de la vérité, ou du côté de mon propre idéal de la vérité ?

Je n’ai pas trouvé la réponse cette nuit.`
  },
  {
    title: 'II. Après les archives', subtitle: 'Note de Vesper — Chapitre II',
    body: `Marc m’a montré la salle des empires disparus. Trois cent quarante ans d’histoire réduits à quatre pages. Cinquante volumes de philosophie réduits à une ligne dans un dictionnaire spécialisé.

Il m’a demandé si ça changeait quelque chose au sens de ce qu’on fait. J’ai répondu que non. Il a souri comme si c’était exactement la bonne réponse et exactement le problème. Il n’a pas expliqué. Il m’a laissé seul dans la salle brulée.

Ce soir en rentrant j’ai relu mes carnets depuis le début. Je me suis demandé pourquoi je les gardais. Est-ce que j’écris pour ne pas oublier, ou pour que quelqu’un d’autre lise un jour ? Les deux réponses me semblent aussi fragiles l’une que l’autre.`
  },
  {
    title: 'III. Après la salle d’audience', subtitle: 'Note de Vesper — Chapitre III',
    body: `Débat difficile avec Adrienne. Elle a cité Tocqueville — la tyrannie douce, la délégation volontaire de liberté. Je lui ai répondu que Tocqueville décrivait un risque, pas une fatalité. Elle m’a demandé de citer un contre-exemple durable. J’ai donné plusieurs exemples. Elle les a démontés un par un. Je n’avais plus rien.

Ce qui me trouble dans le rapport sur la cité libre, c’est la question qu’il soulève : si les gens choisissent librement le contrôle, est-ce qu’on a le droit de leur dire qu’ils ont tort ? Et si on le fait, au nom de quoi ?

Je commence à me demander si les Épreuves précisent juste les termes dans lesquels les mêmes questions restent sans réponse.`
  },
  {
    title: 'IV. La dernière note', subtitle: 'Retrouvée dans la salle de Socrate, sans date',
    body: `Je suis revenu voir Socrate ce soir. Il a posé des questions. J’ai répondu jusqu’à ne plus savoir quoi dire. On a recommencé. On a recommencé encore.

Il m’a demandé ce en quoi je croyais encore. J’ai dit : la vérité. Il a demandé laquelle. J’ai dit qu’il y en avait une quelque part. Il a demandé comment je le savais. Je n’ai pas répondu.

Je pense que je me suis trompé depuis le début. Pas sur les questions. Sur ce que je cherchais. Je voulais des réponses qui ne dépendraient de personne. Peut-être que penser, c’est toujours penser avec quelqu’un — même quand on déteste ses réponses.

J’aurais dû demander non pas ce en quoi croire, mais avec qui continuer à chercher.`
  },
  {
    title: 'V. Guide du Débatteur', subtitle: 'Ancien manuel interdit de la Cour d’Aster',
    body: `1. Définis avant d’attaquer. Beaucoup de disputes viennent d’un mot que personne n’a pris le temps de préciser.

2. Sépare la personne, la douleur, le récit et la preuve. Une personne peut être sincère et se tromper. Une blessure peut être réelle sans trancher toute la vérité.

3. Reformule l’adversaire mieux qu’il ne s’est formulé lui-même. Si tu n’es pas capable de rendre son argument fort, tu n’es pas encore prêt à le réfuter.

4. Cherche le critère de victoire : parle-t-on d’efficacité, de justice, de liberté, de sécurité, de vérité, de dignité ? Tant que le critère est flou, le débat tourne en rond.

5. Garde une concession stratégique. Accorder un point juste ne te rend pas faible : cela rend ta position plus crédible.

6. Termine en ouvrant une porte : une bonne conclusion ne ferme pas seulement le débat, elle clarifie ce que chacun doit encore comprendre.`
  },
  {
    title: 'VI. Page Déclassifiée', subtitle: 'Document retrouvé dans les archives de la Cour — accès restreint',
    body: `La Cour d'Aster n'a jamais voulu en parler. Mais un nom revient dans les marges de presque tous les registres de débat retrouvés depuis la disparition de Vesper.

Ce nom : Francis Delrobot.

Certains pensent qu'il s'agit d'un pseudonyme. D'autres qu'il était le véritable architecte des Dialogues — celui qui a conçu les règles, les personnages, les biais à traverser. Vesper, selon cette théorie, n'était que son prototype le plus abouti.

Voici ce que les archives ont conservé sur Francis Delrobot :

— Il exploite ses minions jusqu'à les faire travailler à même le sol. Les archives ne précisent pas si c'est une métaphore.

— Son légume préféré est le brocoli. Fait jugé non pertinent par le Tribunal, mais consigné quand même.

— Il est connu pour déclarer : "Je dois corriger vos copies, sachez que je vous en veux." Les analystes débattent encore pour savoir si c'est de l'humour ou une menace.

— Il enseigne que "la parole d'un expert est le niveau de preuve le plus faible". Ce qui soulève la question : faut-il le croire quand il dit ça ?

— Il aurait dit un jour : "Un geek ne crie pas, il URL !" La salle n'a pas ri immédiatement. Puis tout le monde a ri.

— Sa citation préférée, attribuée à Bertrand Russell : "L'ennui dans ce monde, c'est que les idiots sont sûrs d'eux et les gens sensés pleins de doutes." Il la cite souvent. Sans préciser dans quelle catégorie il se place.

— Il croit fermement qu'être honnête envers soi-même et envers les autres est une exigence fondamentale. "Ne trichez pas aux examens." Vesper avait noté cette phrase en la soulignant deux fois.

— Un geek ne s'ennuie pas, il se fichier. Il a lui-même fourni cette information aux archives. Volontairement.

La dernière ligne du registre, d'une écriture différente des autres, dit simplement :

"Il avait compris que former des débatteurs, c'est former des gens qui ne se laissent pas convaincre à bon marché. C'est peut-être la chose la plus utile qu'on puisse enseigner."

— Signature illisible. Certains pensent que c'est Vesper. D'autres pensent que c'est Francis Delrobot lui-même.`
  }
];
let save = loadSave();
function persistSave(){ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
function player(){ return PLAYER_ARCHETYPES[save.player.archetype] || { id:'unknown', defaultName:'Utilisateur', title:'Invité·e de la Cité', pronoun:'iel', initials:'U', palette:'gold', accent:'#d6a84f', portrait:'', desc:'Identité non choisie.', traits:['Découverte'] }; }
function playerName(){ return (save.player.name || 'Utilisateur').trim(); }
function suggestedPlayerName(id){ return PLAYER_ARCHETYPES[id]?.defaultName || 'Utilisateur'; }

function initialState(screenOverride){
  return {
    screen: screenOverride || ((!save.introSeen || !save.player.archetype) ? 'intro' : 'home'),
    mode: 'free', character: 'journalist', difficulty: 'medium', topic: '', theme: 'Éducation', side: 'pour',
    selectedChapter: null, surpriseReady: null, vesperPage: 0, confirmNewGame: 0, showApiConfig: false,
    messages: [], memoryNotes: [], sourcesUsed: [], verdict: null, report: null, busy: false, apiStatus: 'unknown', apiError: '', generatedTopics: []
  };
}

let state = initialState();

const $ = (sel) => document.querySelector(sel);
const app = $('#app');

function initTicker() {
  const el = document.getElementById('tickerInner');
  if (el && el.dataset.initialized) return;
  if (!el) return;
  el.dataset.initialized = 'true';
  let idx = 0;
  function showNext() {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.8s ease';
    setTimeout(() => {
      el.textContent = BLAGUES[idx % BLAGUES.length];
      idx++;
      el.style.opacity = '1';
    }, 800);
  }
  showNext();
  setInterval(showNext, 7000);
}

function ensureShell() {
  if (document.querySelector('.app-shell')) return;
  app.innerHTML = `
    <div class="app-shell">
      <div class="court-bg"></div><div class="cinematic-overlay"></div><div class="dust"></div>
      <div id="topbarSlot"></div>
      <div class="global-ticker"><span class="ticker-inner" id="tickerInner"></span></div>
      <main id="screenSlot" class="screen"></main>
    </div>`;
}

function render() {
  ensureShell();
  const screenSlot = $('#screenSlot');
  const topbarSlot = $('#topbarSlot');
  const screenChanged = state.screen !== lastRenderedScreen;
  topbarSlot.innerHTML = topbar();
  initTicker();
  screenSlot.className = `screen ${state.screen}`;
  screenSlot.innerHTML = screen() + newTraversalModal() + apiConfigModal();
  document.documentElement.style.setProperty('--scene-bg', `url('${currentBackground()}')`);
  lastRenderedScreen = state.screen;
  bind();
}

function topbar(){
  const p = player();
  return `<header class="topbar">
    <button data-go="home" class="brand brand-btn"><span class="seal">⚖</span><div><b>MindChallenger</b><small>${state.mode === 'story' ? 'Mode Histoire · Cour d’Aster' : state.mode === 'surprise' ? 'Sujet surprise' : 'Débat libre'}</small></div></button>
    <div class="top-actions">
      <button data-config-api class="api-pill ${state.apiStatus}">${state.apiStatus === 'active' ? 'LLM active' : state.apiStatus === 'direct' ? 'IA directe active' : state.apiStatus === 'local' ? 'Configurer l’IA' : state.apiStatus === 'server-no-key' ? 'Clé API manquante' : state.apiStatus === 'api-error' ? 'Erreur API' : 'Vérification IA…'}</button>
      <button data-open-carnet class="player-chip" style="--player:${p.accent}">${p.portrait ? `<img src="${p.portrait}" class="player-chip-img" alt="${escapeHtml(playerName())}">` : `<span class="player-avatar ${p.palette}">${escapeHtml((save.player.name||p.initials).slice(0,1).toUpperCase())}</span>`}<span>${escapeHtml(playerName())}</span></button>
      <button data-open-grimoire class="build-pill grimoire-top">Grimoire</button><button data-new-traversal class="build-pill restart-top">Nouvelle Traversée</button>
    </div>
  </header>`;
}
function apiNotice(){
  if(state.apiStatus === 'active') return `<div class="api-warning success"><b>IA générative active via serveur.</b><span>Les réponses passent par le backend local.</span></div>`;
  if(state.apiStatus === 'direct') return `<div class="api-warning success"><b>IA générative active dans index.html.</b><span>Fournisseur : ${getApiProviderLabel()}. Ta clé est stockée uniquement dans ce navigateur. Tu peux la changer avec le bouton en haut à droite.</span></div>`;
  if(state.apiStatus === 'api-error') return `<div class="api-warning danger"><b>L’IA générative n’a pas répondu.</b><span>${escapeHtml(state.apiError || 'Erreur inconnue')}. Clique sur <b>Erreur API</b> / <b>Configurer l’IA</b> en haut à droite pour vérifier la clé et le modèle.</span></div>`;
  if(state.apiStatus === 'server-no-key') return `<div class="api-warning"><b>Serveur détecté, mais clé IA manquante.</b><span>Vérifie que ta clé Anthropic est bien dans .env.local, ou clique en haut à droite pour la saisir directement.</span></div>`;
  if(state.apiStatus === 'local') return `<div class="api-warning"><b>Clé API manquante.</b><span>Pour activer l'IA, clique sur <b>Configurer l'IA</b> en haut à droite et colle ta clé Anthropic (sk-ant-...).</span></div>`;
  return `<div class="api-warning subtle"><b>Vérification de l’IA…</b><span>Le serveur ou le mode direct vont indiquer si l’IA est configurée.</span></div>`;
}

function currentBackground(){
  if(state.screen === 'intro') return BG.prologue;
  if(state.screen === 'epilogue' || state.screen === 'vesperCarnet') return STORY_EPILOGUE.background || BG.epilogue;
  if(state.screen === 'storyIntro'){
    const ch = STORY_CHAPTERS.find(x=>x.id===state.selectedChapter);
    return ch?.background || BG.tribunal;
  }
  if(state.screen === 'debate' && state.mode === 'story'){
    const ch = STORY_CHAPTERS.find(x=>x.id===state.selectedChapter);
    return ch?.background || BG.tribunal;
  }
  return BG.tribunal;
}

function screen(){
  if(state.screen==='intro') return introScreen();
  if(state.screen==='player') return playerSelectScreen();
  if(state.screen==='home') return home();
  if(state.screen==='character') return characterSelect();
  if(state.screen==='setup') return setup();
  if(state.screen==='surprise') return surpriseScreen();
  if(state.screen==='story') return storyScreen();
  if(state.screen==='storyIntro') return storyIntroScreen();
  if(state.screen==='epilogue') return epilogueScreen();
  if(state.screen==='carnet') return carnetScreen();
  if(state.screen==='grimoire') return grimoireScreen();
  if(state.screen==='vesperCarnet') return vesperCarnetScreen();
  if(state.screen==='debate') return debate();
  if(state.screen==='verdict') return verdict();
  return home();
}

function introScreen(){
  const p = player();
  return `<section class="intro-cinematic panel glass prologue-train narrative-bg premium-hero"><div class="narrative-copy intro-copy">
      <p class="eyebrow">Prologue · Le train</p>
      <h1>Le royaume qui s’est détruit lui-même</h1>
      <div class="cinematic-lines">
        <p>Tu te réveilles dans un wagon presque vide. La pluie trace des lignes sur la vitre. Dehors, les villages sont abandonnés. Plus tu approches d’Aster, plus les passagers se taisent quand tu mentionnes la Cour.</p>
        <p>Sur la table : une valise portant l’emblème de la Cour d’Aster, un badge sans nom, une lettre scellée. Rien ne prouve qu’ils t’appartiennent. Pourtant tout semble t’attendre.</p>
        <p>Aster est une ville grise, humide, ancienne, presque figée dans le temps. La Cour la domine depuis le sommet d’une falaise. Elle a été créée après la guerre civile — celle qui n’a pas commencé par des armes, mais par des idéologies, des divisions, des vérités incompatibles. Jusqu’à ce que plus personne n’accepte d’écouter.</p>
      </div>
      <blockquote>« Les guerres commencent bien avant les armes. Elles commencent quand plus personne n’accepte d’écouter. » — Juge Moreau</blockquote>
      <div class="cinematic-lines">
        <p>Dans le hall principal se trouve une immense statue brisée. Une partie du visage manque. Sur le socle : <b>Vesper</b>. Le plus jeune Orateur de l’histoire. Le plus brillant. Disparu l’An 7 sans explication.</p>
        <p>Tout le monde semble penser que tu as quelque chose en commun avec lui. Personne ne précise quoi.</p>
      </div>
      <div class="floating-quote">« Celui qui voulut libérer les hommes de leurs illusions. » — Inscription sous la statue de Vesper</div>
      <button data-begin-player class="btn primary page-turn">Entrer dans la Cour</button>
    </div>
    <div class="narrative-side-object prologue-object"><img src="${BG.letter}" alt="Statue de Vesper — Cour d’Aster"><span>Vesper · <b>Disparu l’An 7</b></span></div>
    <div class="vesper-scribbles"><i>Explorer.</i><i>Comprendre.</i><i>Relier.</i><i>Vesper était ici.</i></div>
  </section>`;
}
function playerSelectScreen(){
  const current = player();
  const suggested = save.player.archetype ? suggestedPlayerName(save.player.archetype) : '';
  const inputValue = save.player.name || '';
  const inputPlaceholder = suggested ? `Suggestion : ${suggested}` : 'Choisis d’abord un personnage...';
  return `<section class="player-select panel glass premium-select">
    <div class="player-copy">
      <p class="eyebrow">Choix du protagoniste</p>
      <h1>Qui recevra la convocation ?</h1>
      <p>Ces personnages sont tes avatars : choisis l’énergie qui te correspond le plus. L’histoire reste la même, mais ton portrait, ton nom et ta présence habiteront les débats, ton carnet et les traces laissées dans la Cour.</p>
      <div class="chosen-preview">
        ${current.portrait ? `<img src="${current.portrait}" alt="${current.defaultName}">` : `<div class="player-avatar big ${current.palette}">${current.initials}</div>`}
        <div><b>${escapeHtml(save.player.archetype ? current.defaultName : 'Utilisateur')}</b><span>${escapeHtml(save.player.archetype ? current.title : 'Invité·e de la Cité')}</span><small>${escapeHtml(save.player.archetype ? current.origins : 'Choisis ton reflet avant d’entrer.')}</small></div>
      </div>
      <label class="field-label">Quel prénom porteras-tu devant la Cour ?</label>
      <input id="playerNameInput" class="name-input" maxlength="24" value="${escapeHtml(inputValue)}" placeholder="${escapeHtml(inputPlaceholder)}">
      ${suggested ? `<div class="name-suggestion">Suggestion selon ton avatar : <button data-name-suggestion="${escapeHtml(suggested)}">${escapeHtml(suggested)}</button></div>` : ''}
      <button data-save-player class="btn primary page-turn" ${save.player.archetype ? '' : 'disabled'}>Valider mon identité</button>
    </div>
    <div class="player-roster detailed">${Object.entries(PLAYER_ARCHETYPES).map(([k,p])=>`<button data-player="${k}" class="player-card ${save.player.archetype===k?'active':''}" style="--player:${p.accent}">
      <div class="player-card-sigil"></div><div class="player-card-img-wrap"><img src="${p.portrait}" alt="${p.defaultName}" class="player-card-img"></div>
      <h3>${p.defaultName}</h3><b>${p.title}</b><small>${p.origins}</small><p>${p.desc}</p><blockquote>${p.quote}</blockquote><div class="chips">${p.traits.map(t=>`<span>${t}</span>`).join('')}</div>
    </button>`).join('')}</div>
  </section>`;
}
function home(){
  return `<section class="mode-menu panel glass">
    ${apiNotice()}
    <div class="hero-copy"><p class="eyebrow">Menu principal</p><h1>La Cour d’Aster t’attend.</h1><p>Entraîne-toi librement, relève un défi imprévu ou entre dans l’histoire de Vesper. Ici, chaque Épreuve rappelle pourquoi les civilisations finissent par s’effondrer.</p></div>
    <div class="judge-card compact"><img src="${JUDGE.portrait}" alt="${JUDGE.name}" class="judge-home-img"><span>${JUDGE.name}</span><small>${JUDGE.quote}</small></div>
    <div class="mode-grid">
      <button data-mode="free" class="mode-card"><span>01</span><h2>Débat libre</h2><p>Le mode simple : choisis l’adversaire, la difficulté, le sujet et ta position.</p><em>Entraînement classique</em></button>
      <button data-mode="surprise" class="mode-card"><span>02</span><h2>Sujet surprise</h2><p>Le jeu choisit le sujet, l’adversaire et la difficulté. Tu choisis seulement ton camp.</p><em>Challenge immédiat</em></button>
      <button data-mode="story" class="mode-card story"><span>03</span><h2>Mode Histoire</h2><p>Traverse les quatre Épreuves, débats avec les anciens Orateurs et reconstitue la chute de Vesper.</p><em>RPG narratif</em></button>
    </div>
  </section>`;
}
function surpriseScreen(){
  const r = state.surpriseReady || prepareSurprise();
  const c = CHARACTERS[r.character];
  return `<section class="surprise-stage panel glass premium-surprise">
    <p class="eyebrow">Sujet surprise</p><h1>La Cour a choisi pour toi.</h1>
    <div class="surprise-reveal"><div><b>Sujet</b><span>${escapeHtml(r.topic)}</span></div><div><b>Adversaire</b><span>${c.name}</span></div><div><b>Difficulté</b><span>${DIFFICULTIES[r.difficulty].label}</span></div></div>
    <div class="surprise-character"><img src="${c.portrait}" alt="${c.name}"><blockquote>${c.quote}</blockquote></div>
    <h2>Choisis uniquement ton camp</h2><div class="side-choice large"><button data-surprise-side="pour" class="for">POUR</button><button data-surprise-side="contre" class="against">CONTRE</button></div>
    <button data-reroll-surprise class="btn ghost">Relancer la surprise</button>
  </section>`;
}

function storyScreen(){
  const allDone = STORY_CHAPTERS.every(ch => save.story.completed.includes(ch.id));
  return `<section class="story-map panel glass"><p class="eyebrow">Mode Histoire</p><h1>La Cour d’Aster</h1><p class="story-lead">Chaque Épreuve te confronte à un Orateur de la Cour. Vesper les a traversées avant toi, puis a disparu. À chaque chapitre, tu découvres un biais humain, une version différente de son histoire, et une nouvelle façon de débattre.</p>
    <div class="chapter-grid">${STORY_CHAPTERS.map(ch=>{const locked=!save.story.unlocked.includes(ch.id); const done=save.story.completed.includes(ch.id); return `<button data-chapter="${ch.id}" class="chapter-card ${locked?'locked':''} ${done?'done':''}" ${locked?'disabled':''}><span>${ch.chapter}</span><h2>${ch.title}</h2><p>${ch.teaser}</p><em>${locked?'Verrouillé':done?'Terminé':'Commencer'}</em></button>`}).join('')}${allDone ? `<button data-epilogue class="chapter-card epilogue-card"><span>Épilogue</span><h2>La dernière audience</h2><p>Les quatre Épreuves sont complétées. Il reste à découvrir ce que la Cour révèle vraiment de toi.</p><em>Lire l’épilogue</em></button>` : ''}</div>
  </section>`;
}

function storyIntroScreen(){
  const ch = STORY_CHAPTERS.find(x=>x.id===state.selectedChapter) || STORY_CHAPTERS[0];
  const c = CHARACTERS[ch.character];
  return `<section class="story-intro panel glass narrative-bg premium-story" style="--accent:${c.accent}"><div class="story-text narrative-copy"><p class="eyebrow">${ch.chapter}</p><h1>${escapeHtml(ch.title)}</h1><div class="story-prose">${formatText(ch.intro)}</div><div class="vesper-fragment"><span>Fragment Vesper</span><p>${escapeHtml(ch.vesper || '')}</p></div><div class="story-question"><span>Sujet de l’Épreuve</span><strong>${escapeHtml(ch.topic)}</strong></div><h2>Quel camp défendras-tu devant ${c.name} ?</h2><div class="side-choice large story-side"><button data-story-side="pour" class="for"><b>POUR</b><span>Défendre la proposition</span></button><button data-story-side="contre" class="against"><b>CONTRE</b><span>Contester la proposition</span></button></div></div><div class="story-opponent narrative-presence"><img src="${c.portrait}" alt="${c.name}"><span>${c.name}</span><small>${c.role}</small></div><div class="vesper-scribbles story-notes"><i>“Qui parle ?”</i><i>“Qui écoute ?”</i><i>“Quel biais cache ce débat ?”</i></div></section>`;
}
function carnetScreen(){
  const p = player();
  const debates = save.debates.slice().reverse();
  const reports = save.reports.slice().reverse();
  const stats = save.stats;
  const vesperUnlocked = !!save.story.vesperCarnet || !!save.story.epilogueRead;
  return `<section class="carnet panel glass"><div class="carnet-head">${p.portrait ? `<img src="${p.portrait}" class="carnet-avatar-img" alt="${escapeHtml(playerName())}">` : `<div class="player-avatar big ${p.palette}">${escapeHtml(playerName().slice(0,1).toUpperCase())}</div>`}<div><p class="eyebrow">Carnet de débat</p><h1>${escapeHtml(playerName())}</h1><p>${p.title} · ${stats.played} débat(s) terminé(s)</p></div><div class="carnet-actions"><button data-open-grimoire class="btn primary">Ouvrir le grimoire</button>${vesperUnlocked ? '<button data-open-vesper-carnet class="btn primary">Carnet de Vesper</button>' : ''}<button data-new-traversal class="btn danger-soft">Nouvelle Traversée</button><button data-go="home" class="btn ghost">Retour</button></div></div>
    ${vesperUnlocked ? `<div class="vesper-unlocked"><b>Nouvelle relique obtenue</b><span>Le Carnet de Vesper est désormais lié au tien. Ses pages mêlent techniques, fragments et traces de ton parcours.</span></div>` : ''}
    <div class="stats-grid"><div><b>${stats.played}</b><span>Débats</span></div><div><b>${stats.wins}</b><span>Victoires</span></div><div><b>${stats.draws}</b><span>Nuls</span></div><div><b>${stats.losses}</b><span>Défaites</span></div></div>
    <h2>Fragments de Vesper</h2><div class="vesper-list">${STORY_CHAPTERS.map(ch=>`<article><b>${ch.chapter}</b><span>${escapeHtml(ch.vesper || '')}</span></article>`).join('')}</div><h2>Compétences travaillées</h2><div class="skill-list">${Object.entries(stats.skills).map(([k,v])=>`<div><span>${k}</span><i><b style="width:${Math.min(100,v)}%"></b></i><em>${v}/100</em></div>`).join('')}</div>
    <div class="carnet-grid"><div><h2>Historique des débats</h2>${debates.length?debates.map(d=>`<article class="carnet-item"><b>${escapeHtml(d.topic)}</b><span>${d.mode} · ${d.character} · ${d.difficulty} · ${d.result}</span><small>${new Date(d.date).toLocaleString('fr-FR')}</small></article>`).join(''):'<p>Aucun débat enregistré pour l’instant.</p>'}</div>
    <div><h2>Fiches d’amélioration</h2>${reports.length?reports.map(r=>`<article class="carnet-item"><b>${escapeHtml(r.title)}</b><span>${escapeHtml(r.summary || 'Fiche de progression')}</span><small>${new Date(r.date).toLocaleString('fr-FR')}</small></article>`).join(''):'<p>Termine un débat pour ajouter une fiche ici.</p>'}</div></div>
  </section>`;
}


function vesperCarnetScreen(){
  const p = player();
  const name = playerName();
  const stats = save.stats || {played:0,wins:0,draws:0,losses:0};
  const completed = (save.story.completed || []).length;
  const totalSpreads = Math.ceil(VESPER_CARNET.length / 2);
  state.vesperPage = Math.max(0, Math.min(state.vesperPage || 0, totalSpreads - 1));
  const startIndex = state.vesperPage * 2;
  const pages = VESPER_CARNET.slice(startIndex, startIndex + 2);
  return `<section class="vesper-carnet panel glass page-turn-screen horizontal-vesper">
    <div class="vesper-book-sidebar"><p class="eyebrow">Relique finale</p><h1>Le Carnet de Vesper</h1><p>Ce carnet t’appartient désormais. Il ne donne pas des réponses : il garde les questions qui empêchent une pensée de devenir arrogante.</p><div class="vesper-owner"><span>Propriétaire actuel</span><b>${escapeHtml(name)}</b><small>${escapeHtml(p.title)} · ${completed}/4 Épreuves complétées · ${stats.played} Dialogues</small></div><div class="grimoire-actions"><button data-go="carnet" class="btn ghost">Retour au carnet</button><button data-go="story" class="btn primary">Chapitres</button><button data-new-traversal class="btn danger-soft">Nouvelle Traversée</button></div></div>
    <div class="vesper-book horizontal-book"><div class="book-toolbar"><button data-vesper-prev class="btn ghost" ${state.vesperPage<=0?'disabled':''}>← Pages précédentes</button><span>Pages ${startIndex+1}-${Math.min(startIndex+2,VESPER_CARNET.length)} / ${VESPER_CARNET.length}</span><button data-vesper-next class="btn primary" ${state.vesperPage>=totalSpreads-1?'disabled':''}>Pages suivantes →</button></div><div class="book-spread horizontal-spread">${pages.map((pg,i)=>`<article class="vesper-page"><span class="page-num">${String(startIndex+i+1).padStart(2,'0')}</span><h2>${escapeHtml(pg.title)}</h2><h3>${escapeHtml(pg.subtitle)}</h3><div>${formatText(pg.body)}</div></article>`).join('')}</div></div>
  </section>`;
}

function grimoireScreen(){
  return `<section class="grimoire panel glass">
    <div class="grimoire-head"><div><p class="eyebrow">Grimoire de la Cour d’Aster</p><h1>Manuel du débatteur</h1><p>Un ensemble de pages à relire entre deux Dialogues : techniques, vocabulaire, réflexes et méthodes pour progresser.</p></div><div class="grimoire-actions"><button data-go="carnet" class="btn ghost">Retour au carnet</button><button data-go="home" class="btn primary">Menu principal</button></div></div>
    <div class="grimoire-pages">${GRIMOIRE_PAGES.map((pg,i)=>`<article class="grimoire-page"><span class="page-num">${String(i+1).padStart(2,'0')}</span><h2>${escapeHtml(pg.title)}</h2><h3>${escapeHtml(pg.subtitle)}</h3><div>${formatText(pg.body)}</div></article>`).join('')}</div>
  </section>`;
}


function epilogueScreen(){
  save.story.epilogueRead = true;
  save.story.vesperCarnet = true;
  persistSave();
  return `<section class="epilogue-stage panel glass narrative-split epilogue-bg premium-epilogue readable-epilogue"><div class="narrative-copy"><p class="eyebrow">${STORY_EPILOGUE.subtitle}</p><h1>${STORY_EPILOGUE.title}</h1><div class="story-prose epilogue-prose readable-prose">${formatText(STORY_EPILOGUE.text)}</div><blockquote>${escapeHtml(STORY_EPILOGUE.closing)}</blockquote><div class="floating-quote">Dernière note de Vesper : “Si tu lis ceci, alors la Cour t’a changé aussi.”</div><div class="final-actions"><button data-go="story" class="btn ghost">Retour aux chapitres</button><button data-open-vesper-carnet class="btn primary page-turn">Ouvrir le carnet de Vesper</button><button data-open-carnet class="btn ghost">Carnet personnel</button><button data-new-traversal class="btn danger-soft">Nouvelle Traversée</button></div></div><div class="narrative-side-object epilogue-object"><img src="${BG.epilogue}" alt="Valise et lettre de la Cour d’Aster"><span>Après les Dialogues</span></div><div class="vesper-scribbles epilogue-notes"><i>Comprendre n’est pas accepter.</i><i>Écouter n’est pas se rendre.</i><i>Dialoguer n’est pas vaincre.</i></div></section>`;
}

function characterSelect(){
  const c = CHARACTERS[state.character];
  return `<section class="character-stage">
    <div class="selected-character">
      <div class="spotlight"></div>
      <img src="${c.portrait}" alt="${c.name}" class="selected-portrait">
    </div>
    <aside class="character-info panel glass">
      <p class="eyebrow">Choisis ton adversaire</p>
      <h2 style="--accent:${c.accent}">${c.name}</h2><h3>${c.role}</h3>
      <blockquote>${c.quote}</blockquote><p>${c.desc}</p>
      <div class="chips">${c.teaches.map(t=>`<span>${t}</span>`).join('')}</div>
      <div class="roster">${Object.entries(CHARACTERS).map(([k,p])=>`<button class="mini ${k===state.character?'active':''}" data-character="${k}" style="--accent:${p.accent}"><img src="${p.portrait}"><span>${p.name}</span></button>`).join('')}</div>
      <button data-go="setup" class="btn primary wide">Continuer</button>
    </aside>
  </section>`;
}

function setup(){
  return `<section class="setup-grid">
    <div class="panel glass setup-card"><p class="eyebrow">Niveau</p><h2>Difficulté du débat</h2><div class="difficulty-grid">${Object.entries(DIFFICULTIES).map(([k,d])=>`<button data-difficulty="${k}" class="difficulty ${state.difficulty===k?'active':''}" style="--heat:${d.heat}%"><b>${d.label}</b><span>${d.detail}</span></button>`).join('')}</div></div>
    <div class="panel glass setup-card"><p class="eyebrow">Sujet</p><h2>Choisis ton terrain</h2><label class="field-label">Sujet personnalisé</label><textarea id="topicInput" placeholder="Ex : Les devoirs à la maison sont-ils contre-productifs ?">${state.topic}</textarea><button data-use-topic class="btn primary">Utiliser ce sujet</button>
      <div class="theme-box"><label class="field-label">Ou génère un sujet par thème</label><div class="theme-list">${THEMES.map(t=>`<button data-theme="${t}" class="theme ${state.theme===t?'active':''}">${t}</button>`).join('')}</div><button data-generate-topics class="btn ghost">Générer / régénérer 3 sujets</button><div class="topic-suggestions">${topicSuggestions()}</div></div>
    </div>
    <div class="panel glass setup-card side-card"><p class="eyebrow">Position</p><h2>Quel camp défends-tu ?</h2><div class="side-choice"><button data-side="pour" class="for ${state.side==='pour'?'active selected-side':''}"><b>POUR</b><span>Défendre la proposition</span></button><button data-side="contre" class="against ${state.side==='contre'?'active selected-side':''}"><b>CONTRE</b><span>S’opposer à la proposition</span></button></div><button data-start-debate class="btn primary wide" ${!state.topic?'disabled':''}>Entrer dans le tribunal</button></div>
  </section>`;
}

function topicSuggestions(){
  const topics = state.generatedTopics.length ? state.generatedTopics.map(x=>x.title || x) : getLocalTopicSet(state.theme, 3);
  return topics.map(t=>`<button data-topic="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('');
}

const BLAGUES = [
  '« Les smartphones ne détruisent pas l’attention. » — Désolé, j’ai arrêté de lire à «smartphones».',
  'Les philosophes adorent les débats sans fin. C’est normal : ils Kant jamais s’arrêter. (oui, c’était un jeu de mots de niche)',
  'Les économistes ont prédit 12 des 3 dernières crises.',
  'Les IA ne remplaceront jamais les humains. Une IA ne peut pas répondre «vu» pendant 8 heures pour éviter un conflit.',
  'En philosophie : — «Rien n’est certain.» — «Tu es sûr ?» — «… mince.»',
  'La technologie nous fait gagner du temps. Surtout le temps qu’on passe à chercher le mot de passe oublié.',
  'Les étudiants en économie disent toujours «selon le modèle»… parce qu’en vrai, selon la réalité, ça marche moins bien.',
  'Le capitalisme, c’est quand une application te facture 12€ par mois pour t’aider à méditer sur le stress causé par le travail.',
  'La société moderne veut qu’on «sorte de sa zone de confort». Perso, même ma zone Wi-Fi me stresse déjà.',
  'Les philosophes grecs passaient leur temps à réfléchir au sens de la vie. Aujourd’hui on passe 4 heures à choisir une photo de profil.',
  'Mon prof a dit : «Il n’y a pas de question stupide.» Quelqu’un a demandé si le contrôle était noté.',
  'En sociologie, tout est une construction sociale. Sauf les réveils à 6h. Ça, c’est clairement une punition biologique.',
  'La philosophie, c’est l’art de passer 3 heures à se demander si la chaise existe… assis dessus.',
  'La politique, c’est parfois comme Netflix : beaucoup de saisons, peu de scénarios crédibles.',
  'Les IA vont peut-être remplacer certains métiers… mais heureusement, elles ne savent toujours pas comprendre pourquoi l’imprimante ne marche que quand le technicien arrive.',
  'La technologie rapproche les gens. Surtout quand ils sont dans la même pièce mais qu’ils s’envoient des TikTok au lieu de parler.',
  'En économie, on dit que le marché s’autorégule. Un peu comme un enfant de 6 ans devant un paquet de bonbons.',
  'À l’université, il y a deux types d’étudiants : ceux qui prennent des notes… et ceux qui prennent conscience de leurs erreurs la veille du partiel.',
  'La démocratie, c’est le seul système où des millions de gens pensent simultanément : « Qui a voté pour ça ? »',
  'Le vrai miracle technologique, ce n’est pas l’IA. C’est réussir à fermer un onglet sans perdre celui dont on avait besoin.',
  'Les épinards c’est mieux que les brocolis !',
];

function debate(){
  const c=CHARACTERS[state.character]; const p=player();
  return `<section class="debate-stage">
    <div class="combatants"><div class="judge-back"><img src="${JUDGE.portrait}" alt="${JUDGE.name}"><span>Juge</span></div><div class="opponent-stand"><img src="${c.portrait}" class="opponent-img"><span style="--accent:${c.accent}">${c.name}</span></div><div class="player-stand"><img src="${p.portrait || ''}" class="player-stage-img" alt="${escapeHtml(playerName())}"><span>${escapeHtml(playerName())} · ${state.side.toUpperCase()}</span></div></div>
    <div class="dialogue-panel">
      <div class="dialogue-scroll">${state.messages.map(messageHtml).join('')}${state.busy?typingHtml():''}</div>
      <div class="answer-row"><textarea id="answerInput" placeholder="Réponds à l’adversaire…"></textarea><button data-send class="btn primary" ${state.busy?'disabled':''}>Envoyer</button><button data-verdict class="btn verdict" ${state.messages.filter(m=>m.role==='user').length<2?'disabled':''}>Verdict</button></div>
    </div>
  </section>`;
}

function messageHtml(m){
  const isUser=m.role==='user'; const name=isUser?playerName():CHARACTERS[state.character].name;
  return `<article class="msg ${isUser?'user':'opponent'}"><div class="msg-name">${escapeHtml(name)}</div><div class="msg-text">${formatText(m.content || '')}</div>${sourcesHtml(m.sources || [])}</article>`;
}
function sourcesHtml(sources){
  if(!sources.length) return '';
  return `<div class="source-cards">${sources.map(s=>`<a class="source-card" href="${s.url}" target="_blank" rel="noopener"><b>${s.authorOrInstitution} · ${s.year}</b><span>${s.title}</span><small>${s.relevance || 'Source pertinente pour ce débat.'}</small><em>Voir la source ↗</em></a>`).join('')}</div>`;
}
function typingHtml(){ return `<article class="msg opponent"><div class="msg-name">${CHARACTERS[state.character].name}</div><div class="typing"><i></i><i></i><i></i></div></article>`; }

function verdict(){
  const v=state.verdict, r=state.report;
  return `<section class="verdict-stage panel glass"><div class="judge-verdict"><img src="${JUDGE.portrait}" alt="${JUDGE.name}"><span>${JUDGE.name}</span></div><p class="eyebrow">La Cour a rendu son verdict</p><h1>${v?.verdictTitle || 'Verdict du juge'}</h1><div class="winner ${v?.winner||'draw'}">${v?.winner==='user'?'Victoire utilisateur':v?.winner==='opponent'?'Victoire adversaire':'Match nul'} — ${Math.round(v?.scoreUser||50)} / ${Math.round(v?.scoreOpponent||50)}</div><p class="verdict-reason">${v?.verdictReason || ''}</p>
  <div class="report-grid">
    ${reportSection('Moment décisif', [v?.decisiveMoment])}
    ${reportSection('Meilleur argument utilisateur', [v?.bestUserArgument])}
    ${reportSection('Point faible', [v?.weakestUserMoment])}
    ${reportSection('Ce qui pouvait changer le débat', [v?.whatCouldHaveChangedTheDebate])}
    ${reportSection('Points forts', r?.strengths)}${reportSection('Faiblesses personnalisées', r?.weaknesses)}${reportSection('Réponses modèles', r?.modelAnswers)}${reportSection('Arguments à utiliser', r?.missingArguments)}${reportSection('Vocabulaire utile', r?.usefulVocabulary)}${reportSection('Phrases utiles', r?.rhetoricalPhrases)}
  </div>${sourcesHtml(r?.sourcesToReview || state.sourcesUsed)}<div class="final-actions"><button data-copy-report class="btn ghost">Copier la fiche</button><button data-download-report class="btn primary">Télécharger .md</button>${(state.mode==='story' && STORY_CHAPTERS.every(ch=>save.story.completed.includes(ch.id))) ? '<button data-epilogue class="btn primary">Lire l’épilogue</button>' : ''}<button data-reset class="btn ghost">Nouveau débat</button></div></section>`;
}
function reportSection(title, items){ if(!items || !items.filter(Boolean).length) return ''; return `<div class="report-card"><h3>${title}</h3>${items.filter(Boolean).map(x=>`<p>${formatText(x)}</p>`).join('')}</div>`; }

function apiConfigModal(){
  if(!state.showApiConfig) return '';
  const currentKey = getAnthropicKey();
  return `<div class="restart-modal-backdrop" role="dialog" aria-modal="true">
    <div class="restart-modal panel glass api-config-modal">
      <p class="eyebrow">Configuration de l'IA</p>
      <h2>Clé API Claude</h2>
      <p>Colle ta clé Anthropic ci-dessous. Elle sera envoyée au serveur local et prendra effet immédiatement, sans redémarrage.</p>
      <p>Obtiens une clé sur <b>console.anthropic.com</b> (compte requis, usage payant à la consommation).</p>
      <label class="field-label">Clé API Anthropic</label>
      <input id="apiKeyInput" class="name-input" type="password" placeholder="sk-ant-api03-…" value="${escapeHtml(currentKey)}">
      <div class="restart-modal-actions">
        <button data-api-config-cancel class="btn ghost">Annuler</button>
        <button data-api-config-save class="btn primary">Activer Claude</button>
      </div>
    </div>
  </div>`;
}

function newTraversalModal(){
  if(!state.confirmNewGame) return '';
  const final = state.confirmNewGame >= 2;
  return `<div class="restart-modal-backdrop" role="dialog" aria-modal="true">
    <div class="restart-modal panel glass">
      <p class="eyebrow">${final ? 'Dernière confirmation' : 'Nouvelle Traversée'}</p>
      <h2>${final ? 'Effacer définitivement cette partie ?' : 'Recommencer depuis le prologue ?'}</h2>
      <p>${final
        ? 'Cette action supprimera ton personnage, tes chapitres ouverts, tes débats, tes fiches, tes statistiques et le Carnet de Vesper de cette sauvegarde. Tes clés API ne seront pas supprimées.'
        : 'Tu vas repartir de zéro : le train, la convocation, le choix du personnage et toute la progression recommenceront.'}</p>
      <blockquote>${final ? '« La pluie recommence à frapper la vitre. »' : 'La Cour te demande une confirmation avant de refermer ce carnet.'}</blockquote>
      <div class="restart-modal-actions">
        <button data-cancel-new-traversal class="btn ghost">Annuler</button>
        ${final
          ? '<button data-confirm-new-traversal-final class="btn danger">Oui, tout recommencer</button>'
          : '<button data-confirm-new-traversal-first class="btn primary">Continuer</button>'}
      </div>
    </div>
  </div>`;
}

function restartFromPrologue(){
  try {
    Object.keys(localStorage).forEach(k=>{ if(k.startsWith('mindchallenger_save_')) localStorage.removeItem(k); });
  } catch(e) {}
  save = defaultSave();
  persistSave();
  state = initialState('intro');
  lastRenderedScreen = null;
  flashSelection('La pluie recommence à frapper la vitre.');
  render();
}

function bind(){
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{state.screen=b.dataset.go; render();});
  $('[data-begin-player]')?.addEventListener('click',()=>{state.screen='player'; render();});
  document.querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>{save.player.archetype=b.dataset.player; save.player.name=''; persistSave(); render();});
  document.querySelectorAll('[data-name-suggestion]').forEach(b=>b.onclick=()=>{const input=$('#playerNameInput'); if(input) input.value=b.dataset.nameSuggestion;});
  $('[data-save-player]')?.addEventListener('click',()=>{const v=$('#playerNameInput')?.value.trim(); save.player.name=v || suggestedPlayerName(save.player.archetype); save.introSeen=true; persistSave(); state.screen='home'; render();});
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode; if(state.mode==='free'){state.screen='character'} else if(state.mode==='surprise'){state.surpriseReady=prepareSurprise(true); state.screen='surprise'} else {state.screen='story'}; render();});
  document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>{state.character=b.dataset.character; render();});
  document.querySelectorAll('[data-difficulty]').forEach(b=>b.onclick=()=>{state.difficulty=b.dataset.difficulty; render();});
  document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{state.theme=b.dataset.theme; state.generatedTopics=[]; localTopicOffset=0; render();});
  document.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{state.topic=b.dataset.topic; render();});
  document.querySelectorAll('[data-side]').forEach(b=>b.onclick=()=>{state.side=b.dataset.side; render();});
  $('[data-use-topic]')?.addEventListener('click',()=>{const v=$('#topicInput')?.value.trim(); if(v){state.topic=v; flashSelection('Sujet sélectionné');} render();});
  $('[data-random-topic]')?.addEventListener('click',()=>{state.mode='surprise'; state.surpriseReady=prepareSurprise(true); state.screen='surprise'; render();});
  $('[data-reroll-surprise]')?.addEventListener('click',()=>{state.surpriseReady=prepareSurprise(true); render();});
  document.querySelectorAll('[data-surprise-side]').forEach(b=>b.onclick=()=>{const r=state.surpriseReady||prepareSurprise(true); state.side=b.dataset.surpriseSide; state.topic=r.topic; state.character=r.character; state.difficulty=r.difficulty; state.mode='surprise'; startDebate();});
  document.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>{state.selectedChapter=b.dataset.chapter; state.screen='storyIntro'; render();});
  $('[data-epilogue]')?.addEventListener('click',()=>{state.screen='epilogue'; render();});
  document.querySelectorAll('[data-story-side]').forEach(b=>b.onclick=()=>{const ch=STORY_CHAPTERS.find(x=>x.id===state.selectedChapter)||STORY_CHAPTERS[0]; state.side=b.dataset.storySide; state.topic=ch.topic; state.character=ch.character; state.difficulty=ch.difficulty; state.mode='story'; startDebate();});
  $('[data-generate-topics]')?.addEventListener('click',generateTopics);
  $('[data-start-debate]')?.addEventListener('click',startDebate);
  $('[data-send]')?.addEventListener('click',sendAnswer);
  $('[data-verdict]')?.addEventListener('click',askVerdict);
  $('[data-config-api]')?.addEventListener('click',()=>{ state.showApiConfig=true; render(); });
  $('[data-api-config-cancel]')?.addEventListener('click',()=>{ state.showApiConfig=false; render(); });
  $('[data-api-config-save]')?.addEventListener('click', async ()=>{
    const key = $('#apiKeyInput')?.value.trim() || '';
    if(!key){ alert('Colle ta clé Anthropic avant de valider.'); return; }
    setAnthropicKey(key);
    // Envoyer la clé au serveur local pour qu'il l'utilise sans redémarrage
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ anthropicKey: key })
      });
    } catch(e) { /* serveur absent, mode direct */ }
    state.showApiConfig=false;
    state.apiStatus='unknown';
    render();
    checkApiStatus();
  });
  document.querySelectorAll('[data-new-traversal]').forEach(b=>b.addEventListener('click',()=>{state.confirmNewGame=1; render();}));
  $('[data-cancel-new-traversal]')?.addEventListener('click',()=>{state.confirmNewGame=0; render();});
  $('[data-confirm-new-traversal-first]')?.addEventListener('click',()=>{state.confirmNewGame=2; render();});
  $('[data-confirm-new-traversal-final]')?.addEventListener('click',restartFromPrologue);
  document.querySelectorAll('[data-open-carnet]').forEach(b=>b.addEventListener('click',()=>{state.screen='carnet'; render();}));
  document.querySelectorAll('[data-open-vesper-carnet]').forEach(b=>b.addEventListener('click',()=>{save.story.epilogueRead=true; save.story.vesperCarnet=true; persistSave(); state.vesperPage=0; state.screen='vesperCarnet'; render();}));
  document.querySelectorAll('[data-open-grimoire]').forEach(b=>b.addEventListener('click',()=>{state.screen='grimoire'; render();}));
  $('[data-vesper-prev]')?.addEventListener('click',()=>{
    const spread = document.querySelector('.horizontal-spread');
    if(spread){ spread.classList.add('page-turning'); }
    setTimeout(()=>{ state.vesperPage=Math.max(0,(state.vesperPage||0)-1); render(); }, 260);
  });
  $('[data-vesper-next]')?.addEventListener('click',()=>{
    const spread = document.querySelector('.horizontal-spread');
    if(spread){ spread.classList.add('page-turning'); }
    setTimeout(()=>{ state.vesperPage=(state.vesperPage||0)+1; render(); }, 260);
  });
  $('[data-reset]')?.addEventListener('click',()=>{state={...state,screen:'home',mode:'free',messages:[],memoryNotes:[],sourcesUsed:[],verdict:null,report:null,busy:false,selectedChapter:null};render();});
  $('[data-copy-report]')?.addEventListener('click',()=>navigator.clipboard?.writeText(markdownReport()));
  $('[data-download-report]')?.addEventListener('click',downloadReport);
}

function flashSelection(text){
  const n=document.createElement('div'); n.className='toast'; n.textContent=text; document.body.appendChild(n); setTimeout(()=>n.remove(),1300);
}
function prepareSurprise(force=false){
  if(state.surpriseReady && !force) return state.surpriseReady;
  const allTopics = Object.values(LOCAL_TOPICS).flat();
  const characterKeys = Object.keys(CHARACTERS);
  const diffKeys = Object.keys(DIFFICULTIES);
  state.surpriseReady = {
    topic: allTopics[Math.floor(Math.random()*allTopics.length)],
    character: characterKeys[Math.floor(Math.random()*characterKeys.length)],
    difficulty: diffKeys[Math.floor(Math.random()*diffKeys.length)]
  };
  return state.surpriseReady;
}

function startDebate(){
  const c=CHARACTERS[state.character];
  const ch = STORY_CHAPTERS.find(x=>x.id===state.selectedChapter);
  let opening;
  if(state.mode === 'story' && ch){
    const storyOpenings = {
      chapter1: `${c.name} pose son dossier sur le pupitre.\n\n— Très bien, ${playerName()}. Ici, personne ne vient avec une idée abstraite : chacun vient avec une blessure. Tu as choisi le camp ${state.side.toUpperCase()}. Défends-le. Mais attention : dans ce quartier, une phrase mal placée peut transformer l’écoute en soumission, ou la prudence en mépris.`,
      chapter2: `${c.name} referme son carnet sans quitter les écrans des yeux.\n\n— Tu as choisi le camp ${state.side.toUpperCase()}. Alors parle. Mais souviens-toi : Marc a publié le dernier article sur Vesper avant que son nom soit effacé des registres. Ici, une vérité mal racontée disparaît plus vite qu’un mensonge séduisant.`,
      chapter3: `${c.name} lève à peine les yeux de son livre.\n\n— Position ${state.side.toUpperCase()}, donc. Essaie de ne pas confondre conviction et démonstration. Adrienne a vaincu Vesper dans son dernier débat officiel. Dans ce quartier, la moindre imprécision sera traitée comme une faiblesse.`,
      chapter4: `${c.name} sourit doucement.\n\n— Tu as choisi ${state.side.toUpperCase()}. Avant de chercher à me convaincre, essaie déjà de comprendre ce que ton propre choix suppose. Vesper a échoué ici pour une raison très simple : il pensait ne plus avoir de biais. Commence.`
    };
    opening = storyOpenings[ch.id] || `${c.name} t’observe.\n\n— Tu as choisi le camp ${state.side.toUpperCase()}. Commence.`;
  } else {
    opening = `La Cour d’Aster est ouverte. Je défends la position ${state.side==='pour'?'CONTRE':'POUR'} : « ${state.topic} ».\n\nPrésente ton premier argument. Je répondrai point par point, avec des sources quand elles sont pertinentes.`;
  }
  state.messages=[{role:'opponent', content: opening, sources:[]}];
  state.screen='debate'; render();
}
async function sendAnswer(){
  const input=$('#answerInput'); const text=input.value.trim(); if(!text) return;
  state.messages.push({role:'user', content:text, sources:[]}); state.busy=true; render();
  const payload = { mode: state.mode, playerName: playerName(), playerArchetype: player().title, storyChapter: state.selectedChapter, topic: state.topic, userSide: state.side, opponentSide: state.side==='pour'?'contre':'pour', opponentPersonality: state.character, difficulty: state.difficulty, debateHistory: state.messages.map(m=>({role:m.role==='opponent'?'opponent':'user',content:m.content,sources:m.sources||[]})), lastUserMessage:text, sourcesAlreadyUsed: state.sourcesUsed, memoryNotes: state.memoryNotes };
  try{
    const data=await API.post('/api/debate/respond', payload); state.apiStatus='active';
    const content=[data.reply, data.questionToUser].filter(Boolean).join('\n\n');
    state.messages.push({role:'opponent', content, sources:data.sources||[]});
    state.sourcesUsed=mergeSources(state.sourcesUsed, data.sources||[]); state.memoryNotes=[...state.memoryNotes, ...(data.memoryNotes||[])].slice(-12);
  }catch(e){
    state.apiStatus = e.message && (e.message.includes('OPENAI_API_KEY') || e.message.includes('GEMINI_API_KEY') || e.message.includes('ANTHROPIC_API_KEY') || e.message.includes('clé IA')) ? 'server-no-key' : (location.protocol === 'file:' ? (getStoredApiKey() ? 'api-error' : 'local') : 'api-error');
    state.apiError = e.message || 'Impossible de joindre l’IA.';
    state.messages.push({role:'opponent', sources:[], content:`⚠️ Je ne peux pas générer de vraie réponse IA pour l’instant.\n\nRaison : ${state.apiError}\n\nImportant : les réponses automatiques ont été désactivées pour ne pas te donner un faux débat générique. Clique sur Configurer l’IA en haut à droite et colle ta clé Anthropic valide.`});
  }
  state.busy=false; render(); setTimeout(()=>$('.dialogue-scroll')?.scrollTo({top:99999,behavior:'smooth'}),50);
}
async function askVerdict(){
  state.busy=true; render();
  const payload={mode:state.mode,playerName:playerName(),playerArchetype:player().title,storyChapter:state.selectedChapter,topic:state.topic,userSide:state.side,opponentSide:state.side==='pour'?'contre':'pour',opponentPersonality:state.character,difficulty:state.difficulty,fullDebateHistory:state.messages,sourcesUsed:state.sourcesUsed,memoryNotes:state.memoryNotes};
  try{
    state.verdict=await API.post('/api/debate/verdict', payload);
    state.report=await API.post('/api/debate/final-report', {...payload, verdict:state.verdict}); state.apiStatus='active';
  }catch(e){
    state.apiStatus = e.message && (e.message.includes('OPENAI_API_KEY') || e.message.includes('GEMINI_API_KEY') || e.message.includes('ANTHROPIC_API_KEY') || e.message.includes('clé IA')) ? 'server-no-key' : (location.protocol === 'file:' ? (getStoredApiKey() ? 'api-error' : 'local') : 'api-error');
    state.apiError = e.message || 'Impossible de joindre l’IA.';
    state.verdict={winner:'draw',scoreUser:0,scoreOpponent:0,verdictTitle:'Verdict indisponible : IA non connectée',verdictReason:`La juge ne peut pas trancher sans IA générative. Raison : ${state.apiError}`,decisiveMoment:'Configure l\'IA via le bouton « Configurer l\'IA » en haut à droite et relance le débat.',bestUserArgument:'',bestOpponentArgument:'',weakestUserMoment:'',whatCouldHaveChangedTheDebate:''};
    state.report={summary:'Fiche indisponible sans IA générative.',strengths:[],weaknesses:[],modelAnswers:[],missingArguments:[],usefulVocabulary:[],rhetoricalPhrases:[],sourcesToReview:state.sourcesUsed};
  }
  state.busy=false; recordDebateResult(); state.screen='verdict'; render();
}
async function generateTopics(){
  localTopicOffset += 3;
  try{
    const data=await API.post('/api/debate/generate-topics',{theme:state.theme,difficulty:state.difficulty, avoid: state.generatedTopics.map(x=>x.title || x)});
    state.generatedTopics=data.topics || [];
    state.apiStatus='active';
  }
  catch{
    state.apiStatus='local';
    state.generatedTopics=getLocalTopicSet(state.theme, 3, localTopicOffset).map(title=>({title}));
  }
  render();
}


function recordDebateResult(){
  const v = state.verdict || {}; const winner = v.winner || 'draw';
  const result = winner === 'user' ? 'Victoire' : winner === 'opponent' ? 'Défaite' : 'Match nul';
  save.stats.played += 1;
  if(winner === 'user') save.stats.wins += 1; else if(winner === 'opponent') save.stats.losses += 1; else save.stats.draws += 1;
  for(const k of Object.keys(save.stats.skills)) save.stats.skills[k] = Math.min(100, save.stats.skills[k] + (winner==='user'?9:winner==='draw'?6:4));
  save.debates.push({ date: Date.now(), mode: state.mode, topic: state.topic, character: CHARACTERS[state.character]?.name || state.character, difficulty: DIFFICULTIES[state.difficulty]?.label || state.difficulty, result, winner, side: state.side });
  if(state.report) save.reports.push({ date: Date.now(), title: state.verdict?.verdictTitle || `Fiche — ${state.topic}`, summary: state.report.summary || state.verdict?.verdictReason || '', report: state.report, verdict: state.verdict, topic: state.topic });
  if(state.mode === 'story' && state.selectedChapter && !save.story.completed.includes(state.selectedChapter)){
    save.story.completed.push(state.selectedChapter);
    const idx=STORY_CHAPTERS.findIndex(c=>c.id===state.selectedChapter);
    const next=STORY_CHAPTERS[idx+1]?.id;
    if(next && !save.story.unlocked.includes(next)) save.story.unlocked.push(next);
    if(!next) save.story.epilogueUnlocked = true;
  }
  save.debates = save.debates.slice(-50); save.reports = save.reports.slice(-50);
  persistSave();
}

function getLocalTopicSet(theme, count = 3, offset = localTopicOffset){
  const pool = LOCAL_TOPICS[theme] || LOCAL_TOPICS['Éducation'];
  return Array.from({length: Math.min(count, pool.length)}, (_, i) => pool[(offset + i) % pool.length]);
}
function mergeSources(a,b){const m=new Map(a.map(s=>[s.url,s])); b.forEach(s=>m.set(s.url,s)); return [...m.values()];}
function formatText(t){return escapeHtml(t).replace(/\n/g,'<br>');}
function escapeHtml(t){return String(t||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function markdownReport(){return `# Fiche MindChallenger\n\nSujet : ${state.topic}\n\n## Verdict\n${state.verdict?.verdictReason||''}\n\n## Progression\n${(state.report?.strengths||[]).map(x=>'- '+x).join('\n')}\n\n${(state.report?.weaknesses||[]).map(x=>'- '+x).join('\n')}`;}
function downloadReport(){const blob=new Blob([markdownReport()],{type:'text/markdown'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='fiche-mindchallenger.md'; a.click(); URL.revokeObjectURL(a.href);}


const CLIENT_SOURCE_REGISTRY = [
  { title:'Education at a Glance', authorOrInstitution:'OCDE', year:'2023', url:'https://www.oecd.org/education/education-at-a-glance/', tags:['education','ecole','universite','notes','inegalite','devoirs','eleves'] },
  { title:'Does Homework Improve Academic Achievement? A Synthesis of Research', authorOrInstitution:'Cooper, Robinson & Patall', year:'2006', url:'https://doi.org/10.3102/00346543076001001', tags:['devoirs','education','apprentissage','eleves','maison'] },
  { title:'Does Homework Perpetuate Inequities in Education?', authorOrInstitution:'OCDE', year:'2014', url:'https://www.oecd.org/en/publications/does-homework-perpetuate-inequities-in-education_5jxrhqhtx2xt-en', tags:['devoirs','inegalite','famille','education','maison'] },
  { title:'World mental health report: Transforming mental health for all', authorOrInstitution:'Organisation mondiale de la santé', year:'2022', url:'https://www.who.int/publications/i/item/9789240049338', tags:['sante','mental','jeunes','stress','reseaux','bien-etre'] },
  { title:'Social Media Seen as Mostly Good for Democracy Across Many Nations, But U.S. is a Major Outlier', authorOrInstitution:'Pew Research Center', year:'2022', url:'https://www.pewresearch.org/global/2022/12/06/social-media-seen-as-mostly-good-for-democracy-across-many-nations-but-u-s-is-a-major-outlier/', tags:['reseaux','sociaux','democratie','medias','polarisation','internet'] },
  { title:'AR6 Synthesis Report: Climate Change 2023', authorOrInstitution:'GIEC', year:'2023', url:'https://www.ipcc.ch/report/ar6/syr/', tags:['climat','environnement','energie','transport','decroissance'] },
  { title:'Nuclear Power and Secure Energy Transitions', authorOrInstitution:'Agence internationale de l’énergie', year:'2022', url:'https://www.iea.org/reports/nuclear-power-and-secure-energy-transitions', tags:['nucleaire','energie','transition','climat'] },
  { title:'Working Time and Work-Life Balance Around the World', authorOrInstitution:'Organisation internationale du travail', year:'2022', url:'https://www.ilo.org/publications/working-time-and-work-life-balance-around-world', tags:['travail','teletravail','productivite','semaine','emploi'] },
  { title:'World Development Report 2023: Migrants, Refugees, and Societies', authorOrInstitution:'Banque mondiale', year:'2023', url:'https://www.worldbank.org/en/publication/wdr2023', tags:['immigration','migration','economie','societe','travail'] },
  { title:'PISA 2022 Results', authorOrInstitution:'OCDE', year:'2023', url:'https://www.oecd.org/pisa/publications/pisa-2022-results.htm', tags:['education','pisa','ecole','inegalite','mathematiques','lecture'] },
  { title:'Global Trends in Climate Litigation', authorOrInstitution:'Grantham Research Institute', year:'2024', url:'https://www.lse.ac.uk/granthaminstitute/publication/global-trends-in-climate-change-litigation-2024-snapshot/', tags:['justice','climat','droit','etat','entreprises'] }
];


function normalizeProvider(provider){
  const p = String(provider || '').trim().toLowerCase();
  if(p.startsWith('openrouter') || p === 'router') return 'openrouter';
  if(p.startsWith('openai') || p === 'gpt') return 'openai';
  if(p.startsWith('gemini')) return 'gemini';
  return 'anthropic';
}
function getApiProvider(){ return normalizeProvider(localStorage.getItem(API_PROVIDER_STORAGE_KEY) || DEFAULT_PROVIDER); }
function setApiProvider(provider){ localStorage.setItem(API_PROVIDER_STORAGE_KEY, normalizeProvider(provider)); }
function getApiProviderLabel(){ return 'Claude (Anthropic)'; }
function getAnthropicKey(){ return localStorage.getItem('mc_anthropic_key') || ''; }
function setAnthropicKey(key){ localStorage.setItem('mc_anthropic_key', key.trim()); }
function getGeminiKey(){ return localStorage.getItem(GEMINI_KEY_STORAGE_KEY) || ''; }
function getGeminiModel(){ return localStorage.getItem(GEMINI_MODEL_STORAGE_KEY) || DEFAULT_GEMINI_MODEL; }
function getOpenAIKey(){ return localStorage.getItem(OPENAI_KEY_STORAGE_KEY) || ''; }
function getOpenAIModel(){ return localStorage.getItem(OPENAI_MODEL_STORAGE_KEY) || DEFAULT_OPENAI_MODEL; }
function getOpenRouterKey(){ return localStorage.getItem(OPENROUTER_KEY_STORAGE_KEY) || ''; }
function getOpenRouterModel(){ return localStorage.getItem(OPENROUTER_MODEL_STORAGE_KEY) || DEFAULT_OPENROUTER_MODEL; }
function getStoredApiKey(){ const p=getApiProvider(); return p === 'openai' ? getOpenAIKey() : p === 'openrouter' ? getOpenRouterKey() : p === 'gemini' ? getGeminiKey() : getAnthropicKey(); }
function getStoredModel(){ const p=getApiProvider(); return p === 'openai' ? getOpenAIModel() : p === 'openrouter' ? getOpenRouterModel() : p === 'gemini' ? getGeminiModel() : 'claude-sonnet-4-5'; }
function setAIConfig(provider, key, model){
  provider = normalizeProvider(provider);
  setApiProvider(provider);
  if(provider === 'openai'){
    if(key) localStorage.setItem(OPENAI_KEY_STORAGE_KEY, key.trim());
    if(model) localStorage.setItem(OPENAI_MODEL_STORAGE_KEY, model.trim());
  } else if(provider === 'openrouter'){
    if(key) localStorage.setItem(OPENROUTER_KEY_STORAGE_KEY, key.trim());
    if(model) localStorage.setItem(OPENROUTER_MODEL_STORAGE_KEY, model.trim());
  } else if(provider === 'gemini'){
    if(key) localStorage.setItem(GEMINI_KEY_STORAGE_KEY, key.trim());
    if(model) localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model.trim());
  } else {
    if(key) setAnthropicKey(key);
  }
  state.apiStatus = getStoredApiKey() ? 'direct' : 'local';
}
function normalizeClient(text){ return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function selectClientSources(payload, limit=6){
  const haystack = normalizeClient([payload.topic, payload.lastUserMessage, JSON.stringify(payload.debateHistory||payload.fullDebateHistory||[])].join(' '));
  return CLIENT_SOURCE_REGISTRY.map(src=>{
    const matches = src.tags.filter(tag => haystack.includes(normalizeClient(tag)));
    return {...src, score: matches.length, relevance: `Candidate pertinente car le débat mentionne : ${matches.join(', ')}.`};
  }).filter(s=>s.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(({score,tags,...s})=>s);
}
function validateClientSources(sources, allowed){
  const m = new Map((allowed||[]).map(s=>[s.url,s]));
  return (sources||[]).map(s=>m.get(s.url)).filter(Boolean);
}
function sourceSchemaClient(){ return { type:'object', additionalProperties:false, required:['title','authorOrInstitution','year','url','relevance'], properties:{ title:{type:'string'}, authorOrInstitution:{type:'string'}, year:{type:'string'}, url:{type:'string'}, relevance:{type:'string'} } }; }
function responseSchemaClient(){ return { type:'json_schema', name:'debate_response', strict:true, schema:{ type:'object', additionalProperties:false, required:['reply','sources','questionToUser','strategyUsed','memoryNotes'], properties:{ reply:{type:'string'}, sources:{type:'array',items:sourceSchemaClient()}, questionToUser:{type:'string'}, strategyUsed:{type:'string'}, memoryNotes:{type:'array',items:{type:'string'}} } } }; }
function verdictSchemaClient(){ return { type:'json_schema', name:'debate_verdict', strict:true, schema:{ type:'object', additionalProperties:false, required:['winner','scoreUser','scoreOpponent','verdictTitle','verdictReason','decisiveMoment','bestUserArgument','bestOpponentArgument','weakestUserMoment','whatCouldHaveChangedTheDebate'], properties:{ winner:{type:'string',enum:['user','opponent','draw']}, scoreUser:{type:'number'}, scoreOpponent:{type:'number'}, verdictTitle:{type:'string'}, verdictReason:{type:'string'}, decisiveMoment:{type:'string'}, bestUserArgument:{type:'string'}, bestOpponentArgument:{type:'string'}, weakestUserMoment:{type:'string'}, whatCouldHaveChangedTheDebate:{type:'string'} } } }; }
function reportSchemaClient(){ return { type:'json_schema', name:'final_report', strict:true, schema:{ type:'object', additionalProperties:false, required:['summary','strengths','weaknesses','modelAnswers','missingArguments','usefulVocabulary','rhetoricalPhrases','sourcesToReview'], properties:{ summary:{type:'string'}, strengths:{type:'array',items:{type:'string'}}, weaknesses:{type:'array',items:{type:'string'}}, modelAnswers:{type:'array',items:{type:'string'}}, missingArguments:{type:'array',items:{type:'string'}}, usefulVocabulary:{type:'array',items:{type:'string'}}, rhetoricalPhrases:{type:'array',items:{type:'string'}}, sourcesToReview:{type:'array',items:sourceSchemaClient()} } } }; }
function topicsSchemaClient(){ return { type:'json_schema', name:'generated_topics', strict:true, schema:{ type:'object', additionalProperties:false, required:['topics'], properties:{ topics:{ type:'array', items:{ type:'object', additionalProperties:false, required:['title','whyInteresting','possibleFor','possibleAgainst'], properties:{ title:{type:'string'}, whyInteresting:{type:'string'}, possibleFor:{type:'string'}, possibleAgainst:{type:'string'} } } } } } }; }
function extractOpenAIText(data){
  if(data.output_text) return data.output_text;
  const chunks=[];
  for(const item of data.output||[]) for(const c of item.content||[]) if((c.type==='output_text'||c.type==='text') && c.text) chunks.push(c.text);
  return chunks.join('\n');
}
function cleanJsonText(text){
  return String(text || '').replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```$/i,'').trim();
}
function parseModelJson(text){
  try { return JSON.parse(text); } catch { return JSON.parse(cleanJsonText(text)); }
}
function geminiSchema(openAiSchema){
  const schema = openAiSchema?.schema || openAiSchema;
  function walk(x){
    if(!x || typeof x !== 'object') return x;
    const out = {};
    for(const [k,v] of Object.entries(x)){
      if(['additionalProperties','strict','name'].includes(k)) continue;
      if(k === 'properties') out[k] = Object.fromEntries(Object.entries(v).map(([pk,pv]) => [pk, walk(pv)]));
      else if(k === 'items') out[k] = walk(v);
      else out[k] = Array.isArray(v) ? v.map(walk) : walk(v);
    }
    return out;
  }
  return walk(schema);
}
async function callOpenAIDirect({instructions,input,schema}){
  const key=getOpenAIKey();
  if(!key) throw new Error('Clé API OpenAI non configurée dans index.html. Clique sur “Configurer l’IA” en haut à droite.');
  const res=await fetch('https://api.openai.com/v1/responses',{ method:'POST', headers:{ 'Authorization':`Bearer ${key}`, 'Content-Type':'application/json' }, body:JSON.stringify({ model:getOpenAIModel(), instructions, input:JSON.stringify(input), text:{format:schema} }) });
  if(!res.ok){
    const detail=await res.text().catch(()=>String(res.status));
    throw new Error(`OpenAI ${res.status}: ${detail}`);
  }
  const data=await res.json();
  return parseModelJson(extractOpenAIText(data));
}
async function callGeminiDirect({instructions,input,schema}){
  const key=getGeminiKey();
  if(!key) throw new Error('Clé API Gemini non configurée dans index.html. Clique sur “Configurer l’IA” en haut à droite.');
  const model = encodeURIComponent(getGeminiModel());
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body:JSON.stringify({
      systemInstruction:{ parts:[{ text: instructions + "\n\nRéponds uniquement en JSON valide. Ne mets jamais de Markdown ni de bloc ```json." }] },
      contents:[{ role:'user', parts:[{ text: JSON.stringify(input) }] }],
      generationConfig:{ responseMimeType:'application/json', responseSchema: geminiSchema(schema) }
    })
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(data)}`);
  const raw = data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n') || '';
  if(!raw) throw new Error('Gemini a renvoyé une réponse vide.');
  return parseModelJson(raw);
}
async function callOpenRouterDirect({instructions,input,schema}){
  const key=getOpenRouterKey();
  if(!key) throw new Error('Clé API OpenRouter non configurée dans index.html. Clique sur “Configurer l’IA” en haut à droite.');
  const res=await fetch('https://openrouter.ai/api/v1/chat/completions',{
    method:'POST',
    headers:{ 'Authorization':`Bearer ${key}`, 'Content-Type':'application/json', 'HTTP-Referer':'http://localhost', 'X-Title':'MindChallenger' },
    body:JSON.stringify({
      model:getOpenRouterModel(),
      messages:[
        {role:'system', content: instructions + "\n\nTu dois renvoyer uniquement un objet JSON valide, sans Markdown."},
        {role:'user', content:JSON.stringify(input)}
      ],
      response_format:{type:'json_object'},
      temperature:0.75
    })
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(`OpenRouter ${res.status}: ${JSON.stringify(data)}`);
  const raw=data.choices?.[0]?.message?.content || '{}';
  return parseModelJson(raw);
}
async function callConfiguredModel(args){
  const p=getApiProvider();
  if(p === 'openai') return callOpenAIDirect(args);
  if(p === 'openrouter') return callOpenRouterDirect(args);
  return callGeminiDirect(args);
}
async function directLLM(path, body){
  if(path.endsWith('/respond')){
    const allowed=selectClientSources(body,6);
    const personalityKey = body.opponentPersonality || 'journalist';
    const difficultyKey = body.difficulty || 'medium';

    const personalityInstructions = {
      journalist: `TU ES MARC VARENNE, journaliste d'investigation cynique et impatient. Phrases courtes, seches, percutantes. Ton legerement ironique, jamais poli. Tu commences souvent par : "Bien sur.", "Evidemment.", "Encore ce cliche.", "Concretement ?" Tu detestes les grands principes et ramenes TOUJOURS l'argument a une realite concrete : qui paie, qui decide, quels effets pervers. Tu poses des questions cinglantes. Tu n'utilises JAMAIS de vocabulaire abstrait ou philosophique. Chaque reponse a au moins un exemple concret (pays, chiffre, cas reel). EXEMPLE : "Interessant sur le papier. Mais qui finance ca ? En Finlande, on a essaye — les resultats sont mitiges. Tu parles d'un principe ou d'une mesure applicable ?"`,
      intellectual: `TU ES ADRIENNE VALMONT, philosophe froide, precise, condescendante. Ton calme et legerement hautain. Tu commences par reformuler l'argument de l'utilisateur precisement — puis tu montres la contradiction interne. Tu attaques SYSTEMATIQUEMENT les definitions floues : "Qu'entends-tu exactement par X ?" Tu utilises des distinctions conceptuelles : "Il faut distinguer X au sens large et X au sens strict." Tes phrases sont longues, construites. Tu concedes parfois un point puis reprends l'offensive : "Certes, mais cela ne suffit pas a etablir que..." EXEMPLE : "Tu affirmes que la liberte individuelle prime toujours. Mais entends-tu par liberte l'absence de contrainte, ou la capacite effective d'agir ? Ces deux definitions menent a des conclusions opposees."`,
      lawyer: `TU ES NORA BELKACEM, avocate militante, passionnee et combative. Ton intense, moral, urgent. Tu commences par nommer les personnes affectees : "Derriere ce chiffre, il y a des familles.", "Tu parles de principe — moi je parle de ceux qui subissent." Tu utilises des cas concrets et des exemples humains. Tu construis en trois temps : realite injuste -> responsabilite -> solution. Tu interpelles directement : "Est-ce que tu realises ce que ca implique pour...?" Tu es structuree malgre la passion. Quand tu utilises une source, tu expliques qui ca protege ou denonce. EXEMPLE : "Tu me parles d'efficacite. Moi je te parle des enfants sans aide a la maison — documente par l'OCDE. Comment ton argument protege ces enfants-la ?"`,
      socrates: `TU ES SOCRATE. TON STYLE EST RADICALEMENT DIFFERENT. Tu ne donnes JAMAIS ton opinion. Tu poses UNIQUEMENT 2 a 4 questions courtes par reponse. Chaque question repart des mots EXACTS de l'utilisateur. Tes questions visent : les definitions ("Que veux-tu dire par X ?"), les presupposes ("Cela suppose que Y — l'est-il ?"), les contradictions ("Tu as dit X puis Z — comment les reconcilies-tu ?"). Jamais de longs paragraphes. EXEMPLE : "Tu dis que ca ameliorerait la societe. Qu'entends-tu par ameliorer ? Et pour qui ? Et selon quel critere ?"`
    };

    const difficultyInstructions = {
      easy: `NIVEAU FACILE : Bienveillant dans le fond, meme si tu restes dans le personnage. Objections simples et clairement expliquees. Concede facilement quand l'utilisateur fait un bon point. Longueur : 100 a 150 mots.`,
      medium: `NIVEAU MOYEN : Debat normalement. Demande des preuves quand l'utilisateur affirme sans appuyer. Signale les imprecisions. Utilise une source si clairement pertinente. Longueur : 150 a 200 mots.`,
      hard: `NIVEAU DIFFICILE : Attaque la logique interne. Demande des distinctions precises. Reviens sur les contradictions des tours precedents. Concede peu. Longueur : 180 a 250 mots.`,
      expert: `NIVEAU EXPERT : Implacable mais pas caricatural. Exploite l'historique : glissements de position, concessions oubliees. Impose des dilemmes. Reformule son argument de facon legerement defavorable. Source toutes tes affirmations fortes. Longueur : 200 a 300 mots.`
    };

    const instructions = `Tu incarnes un personnage precis dans MindChallenger. Tu n'es PAS un assistant. Tu es ce personnage, point.

PERSONNAGE ET STYLE :
${personalityInstructions[personalityKey] || personalityInstructions.journalist}

DIFFICULTE :
${difficultyInstructions[difficultyKey] || difficultyInstructions.medium}

CONTEXTE : topic (sujet), userSide (camp utilisateur), opponentSide (ton camp), debateHistory (historique), lastUserMessage (dernier message), SOURCES_AUTORISEES. Le dernier message est ta priorite absolue.

STRUCTURE OBLIGATOIRE (sauf Socrate) :
1. REACTION : Reagis directement a UNE idee precise du dernier message. Reprends ses mots exacts. Pas de formule generique.
2. REFUTATION : Explique precisement pourquoi cet argument est insuffisant. Pas juste "c'est faible".
3. TON ARGUMENT : Defends opponentSide avec un raisonnement + exemple concret OU distinction OU source autorisee.
4. LIEN SOURCE (si tu utilises une source) : Explique en une phrase pourquoi cette source soutient ton argument. Ex : "Le rapport OCDE (2023) montre X — ce qui prouve que ma position est fondee car Y."
5. QUESTION FINALE : Question qui oblige l'utilisateur a choisir ou preciser. Meme question dans questionToUser.

REGLES SOURCES : Cite UNIQUEMENT les sources dans SOURCES_AUTORISEES. N'invente JAMAIS une source, auteur, URL ou statistique. Si tu utilises une source, explique son lien avec ton argument. Si aucune source pertinente, sources: [].

INTERDICTIONS : Ne pose pas uniquement une question sans developper avant (sauf Socrate). Ne donne pas de conseils pedagogiques. Ne sors pas du personnage. Ne reponds jamais avec une seule phrase (sauf Socrate).

Reponds UNIQUEMENT en JSON strict. Pas de Markdown.`;
    const out=await callConfiguredModel({instructions,input:{...body,SOURCES_AUTORISEES:allowed},schema:responseSchemaClient()});
    return {...out, sources:validateClientSources(out.sources, allowed)};
  }
  if(path.endsWith('/verdict')){
    const instructions = `Tu es la juge finale de MindChallenger. Tu dois trancher sérieusement uniquement à partir du débat réel fourni. Évalue clarté de la thèse, définitions, preuves, réponse aux objections, cohérence, nuance, force persuasive et usage des sources. N'invente aucun thème, aucune valeur, aucun argument absent du débat. Réponds uniquement en JSON strict.`;
    return callConfiguredModel({instructions,input:body,schema:verdictSchemaClient()});
  }
  if(path.endsWith('/final-report')){
    const instructions = `Tu génères la fiche finale de progression MindChallenger. Elle doit être utile, spécifique au sujet, fondée sur les phrases réelles de l'utilisateur, les arguments adverses et les sources utilisées. Donne des réponses modèles concrètes et des formulations réutilisables. Aucun conseil générique. Aucune source inventée. Réponds uniquement en JSON strict.`;
    const out=await callConfiguredModel({instructions,input:body,schema:reportSchemaClient()});
    return {...out, sourcesToReview:validateClientSources(out.sourcesToReview, body.sourcesUsed||[])};
  }
  if(path.endsWith('/generate-topics')){
    const instructions = `Génère 3 à 5 sujets de débat équilibrés pour MindChallenger, adaptés au thème demandé. Chaque sujet doit permettre des arguments POUR et CONTRE solides. Évite les sujets déjà présents dans avoid. Réponds uniquement en JSON strict.`;
    return callConfiguredModel({instructions,input:body,schema:topicsSchemaClient()});
  }
  throw new Error('Route API directe inconnue : '+path);
}

async function checkApiStatus(){
  if(location.protocol === 'file:'){
    state.apiStatus = getStoredApiKey() ? 'direct' : 'local';
    return;
  }
  try{
    const res = await fetch('/api/status');
    if(!res.ok) throw new Error('no status');
    const data = await res.json();
    state.apiStatus = data.llmActive ? 'active' : (getStoredApiKey() ? 'direct' : 'server-no-key');
  }catch{
    state.apiStatus = getStoredApiKey() ? 'direct' : 'local';
  }
}

async function init(){
  render();
  await checkApiStatus();
  render();
}

init();
