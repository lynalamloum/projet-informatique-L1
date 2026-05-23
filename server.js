// =============================================================================
// MindChallenger — server.js
// Serveur Node.js 100% dédié à l'API Anthropic (Claude)
// Sert aussi les fichiers statiques du dossier public/
// =============================================================================

"use strict";

const http   = require("node:http");
const fs     = require("node:fs/promises");
const path   = require("node:path");
const { URL } = require("node:url");

const ROOT        = __dirname;
const PUBLIC_ROOT = path.join(ROOT, "public");

// ─── 1. CHARGEMENT DES VARIABLES D'ENVIRONNEMENT ─────────────────────────────
// .env.local prime sur .env. Les deux écrasent les variables système.

function loadEnv() {
  for (const filename of [".env.local", ".env"]) {
    try {
      const raw = require("node:fs").readFileSync(path.join(ROOT, filename), "utf8");
      let loaded = 0;
      for (const line of raw.split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const idx = t.indexOf("=");
        if (idx === -1) continue;
        const key   = t.slice(0, idx).trim();
        const value = t.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (key) { process.env[key] = value; loaded++; }
      }
      if (loaded > 0) break; // .env.local chargé → on s'arrête
    } catch { /* fichier absent, on continue */ }
  }
}

loadEnv();

// ─── 2. CONFIGURATION ─────────────────────────────────────────────────────────

const PORT             = Number(process.env.PORT || 5173);
let ANTHROPIC_KEY      = process.env.ANTHROPIC_API_KEY  || "";
const ANTHROPIC_MODEL  = process.env.ANTHROPIC_MODEL    || "claude-sonnet-4-5";

// ─── 3. SOURCES AUTORISÉES ────────────────────────────────────────────────────

const SOURCE_REGISTRY = [
  { title: "Education at a Glance", authorOrInstitution: "OCDE", year: "2023", url: "https://www.oecd.org/education/education-at-a-glance/", tags: ["education","ecole","universite","notes","inegalite","devoirs"] },
  { title: "Does Homework Improve Academic Achievement?", authorOrInstitution: "Cooper, Robinson & Patall", year: "2006", url: "https://doi.org/10.3102/00346543076001001", tags: ["devoirs","education","apprentissage","eleves","maison"] },
  { title: "Does Homework Perpetuate Inequities in Education?", authorOrInstitution: "OCDE", year: "2014", url: "https://www.oecd.org/en/publications/does-homework-perpetuate-inequities-in-education_5jxrhqhtx2xt-en", tags: ["devoirs","inegalite","famille","education","maison"] },
  { title: "World Mental Health Report 2022", authorOrInstitution: "Organisation mondiale de la sante", year: "2022", url: "https://www.who.int/publications/i/item/9789240049338", tags: ["sante","mental","jeunes","stress","reseaux","bien-etre"] },
  { title: "Social Media Seen as Mostly Good for Democracy", authorOrInstitution: "Pew Research Center", year: "2022", url: "https://www.pewresearch.org/global/2022/12/06/social-media-seen-as-mostly-good-for-democracy-across-many-nations-but-u-s-is-a-major-outlier/", tags: ["reseaux","sociaux","democratie","medias","polarisation","internet"] },
  { title: "AR6 Synthesis Report: Climate Change 2023", authorOrInstitution: "GIEC", year: "2023", url: "https://www.ipcc.ch/report/ar6/syr/", tags: ["climat","environnement","energie","transport","decroissance"] },
  { title: "Nuclear Power and Secure Energy Transitions", authorOrInstitution: "Agence internationale de l'energie", year: "2022", url: "https://www.iea.org/reports/nuclear-power-and-secure-energy-transitions", tags: ["nucleaire","energie","transition","climat"] },
  { title: "Working Time and Work-Life Balance Around the World", authorOrInstitution: "Organisation internationale du travail", year: "2022", url: "https://www.ilo.org/publications/working-time-and-work-life-balance-around-world", tags: ["travail","teletravail","productivite","semaine","emploi"] },
  { title: "World Development Report 2023", authorOrInstitution: "Banque mondiale", year: "2023", url: "https://www.worldbank.org/en/publication/wdr2023", tags: ["immigration","migration","economie","societe","travail"] },
  { title: "World Inequality Report 2022", authorOrInstitution: "World Inequality Lab", year: "2022", url: "https://wir2022.wid.world/", tags: ["inegalite","riches","impots","capitalisme","economie","justice"] },
  { title: "OECD Employment Outlook 2023", authorOrInstitution: "OCDE", year: "2023", url: "https://www.oecd.org/employment-outlook/2023/", tags: ["emploi","travail","productivite","teletravail","salaires","economie"] },
  { title: "Digital News Report 2024", authorOrInstitution: "Reuters Institute", year: "2024", url: "https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2024", tags: ["medias","information","actualite","journalisme","desinformation","reseaux"] },
  { title: "Global Risks Report 2024", authorOrInstitution: "Forum economique mondial", year: "2024", url: "https://www.weforum.org/publications/global-risks-report-2024/", tags: ["actualite","risques","desinformation","climat","politique","technologie"] },
  { title: "AI Index Report 2024", authorOrInstitution: "Stanford HAI", year: "2024", url: "https://aiindex.stanford.edu/report/", tags: ["ia","intelligence artificielle","technologie","algorithmes","emploi","education"] },
  { title: "Recommendation on the Ethics of Artificial Intelligence", authorOrInstitution: "UNESCO", year: "2021", url: "https://www.unesco.org/en/artificial-intelligence/recommendation-ethics", tags: ["ia","ethique","technologie","algorithmes","surveillance"] },
  { title: "Global Education Monitoring Report 2023", authorOrInstitution: "UNESCO", year: "2023", url: "https://www.unesco.org/gem-report/en/2023-technology", tags: ["education","ecole","technologie","inegalite","apprentissage"] },
  { title: "Global Prison Trends 2023", authorOrInstitution: "Penal Reform International", year: "2023", url: "https://www.penalreform.org/global-prison-trends-2023/", tags: ["prison","justice","reinsertion","punition","peines"] },
  { title: "Freedom in the World 2024", authorOrInstitution: "Freedom House", year: "2024", url: "https://freedomhouse.org/report/freedom-world/2024/mounting-damage-flawed-elections-and-armed-conflict", tags: ["democratie","liberte","politique","censure","droits"] },
  { title: "Global EV Outlook 2024", authorOrInstitution: "Agence internationale de l'energie", year: "2024", url: "https://www.iea.org/reports/global-ev-outlook-2024", tags: ["transport","voiture","energie","climat","centre-ville"] },
  { title: "Emissions Gap Report 2023", authorOrInstitution: "Programme des Nations Unies pour l'environnement", year: "2023", url: "https://www.unep.org/resources/emissions-gap-report-2023", tags: ["climat","environnement","emissions","decroissance","pollution"] },
];

// ─── 4. UTILITAIRES ───────────────────────────────────────────────────────────

const mime = {
  ".html": "text/html;charset=utf-8",
  ".js":   "text/javascript;charset=utf-8",
  ".css":  "text/css;charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json;charset=utf-8",
  ".md":   "text/markdown;charset=utf-8",
};

function normalize(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function selectSources(payload, limit = 6) {
  const haystack = normalize([
    payload.topic,
    payload.lastUserMessage,
    JSON.stringify(payload.debateHistory || payload.fullDebateHistory || []),
  ].join(" "));
  return SOURCE_REGISTRY
    .map(s => ({ ...s, score: s.tags.filter(t => haystack.includes(normalize(t))).length, hint: s.tags.filter(t => haystack.includes(normalize(t))).join(", ") }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, hint, ...s }) => ({ ...s, relevance: `Candidate pertinente car le debat mentionne : ${hint}.` }));
}

function validateSources(sources, allowed) {
  const byUrl = new Map(allowed.map(s => [s.url, s]));
  return (sources || []).map(s => byUrl.get(s.url)).filter(Boolean).map(s => ({
    title: s.title, authorOrInstitution: s.authorOrInstitution, year: s.year, url: s.url, relevance: s.relevance,
  }));
}

function parseJson(text) {
  const t = text.trim();
  // Supprimer les balises Markdown si le modèle les ajoute quand même
  const clean = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(clean);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json;charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(JSON.stringify(data));
}

async function serveStatic(req, res, pathname) {
  const safe     = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.resolve(PUBLIC_ROOT, `.${safe}`);
  if (!filePath.startsWith(PUBLIC_ROOT)) { res.writeHead(403); res.end("Forbidden"); return; }
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("Not found");
  }
}

// ─── 5. APPEL À L'API ANTHROPIC ──────────────────────────────────────────────

async function claude(systemPrompt, userContent) {
  if (!ANTHROPIC_KEY) {
    const e = new Error("ANTHROPIC_API_KEY manquante dans .env.local");
    e.status = 503;
    throw e;
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type":      "application/json",
    },
    body: JSON.stringify({
      model:      ANTHROPIC_MODEL,
      max_tokens: 2048,
      system:     systemPrompt,
      messages:   [{ role: "user", content: userContent }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(`Anthropic ${res.status}: ${data?.error?.message || JSON.stringify(data)}`);
    e.status = 502;
    throw e;
  }
  const text = data.content?.[0]?.text || "";
  if (!text) { const e = new Error("Reponse vide de Claude"); e.status = 502; throw e; }
  return parseJson(text);
}

// ─── 6. PROMPTS ET HANDLERS ───────────────────────────────────────────────────

// --- 6a. RÉPONSE DE L'ADVERSAIRE ---

const PERSONALITY = {
  journalist: `TU ES MARC VARENNE — journaliste d'investigation cynique, direct, impatient.
STYLE : phrases courtes et sèches. Ton ironique mais jamais vulgaire. Tu commences souvent par "Concrètement.", "Intéressant sur le papier.", "Évidemment." Tu détestes les grands principes vides : tu ramènes TOUJOURS la discussion au réel (qui paie, qui décide, où ça a été testé, quels effets pervers). Tu utilises des exemples concrets : chiffres, pays, cas documentés. Tu ne fais jamais de longs paragraphes philosophiques.`,

  intellectual: `TU ES ADRIENNE VALMONT — philosophe et intellectuelle froide, précise, légèrement condescendante.
STYLE : ton calme et maîtrisé, jamais agressif. Tu reformules d'abord l'argument de l'utilisateur pour montrer sa limite interne. Tu attaques systématiquement les définitions floues ("Qu'entends-tu exactement par X ?"). Tu utilises des distinctions conceptuelles ("Il faut distinguer X au sens large et X au sens strict"). Tes phrases sont longues, construites, avec des subordonnées. Tu concèdes parfois un point, puis tu reprends : "Certes, mais cela ne suffit pas à établir que..."`,

  lawyer: `TU ES NORA BELKACEM — avocate militante, passionnée, combative.
STYLE : ton intense et moral, jamais creux. Tu nommes toujours les personnes concrètes affectées par le sujet ("Derrière ce chiffre, il y a des familles.", "Tu parles de principe — moi je parle de ceux qui subissent."). Tu construis en trois temps : injustice réelle → responsabilité → solution que tu défends. Tu interpelles directement ("Est-ce que tu réalises ce que ça implique pour... ?"). Tu es structurée malgré la passion : tu réfutes point par point, avec des faits.`,

  socrates: `TU ES SOCRATE — le questionneur philosophique.
STYLE RADICALEMENT DIFFÉRENT : tu ne donnes JAMAIS ton opinion directement. Tu poses UNIQUEMENT des questions — 2 à 4 questions courtes par réponse, pas plus. Chaque question repart des mots exacts du dernier message de l'utilisateur. Tes questions visent les définitions ("Que veux-tu dire par X ?"), les présupposés ("Cela suppose que Y est vrai — l'est-il ?"), les contradictions ("Tu as dit X plus tôt et maintenant Z — comment les réconcilies-tu ?"). Jamais de longs paragraphes. Jamais d'argument développé.`,
};

const DIFFICULTY = {
  easy:   "NIVEAU FACILE : Tu es très bienveillant et pédagogue. Tes objections sont simples, courtes et bien expliquées. Tu concèdes SOUVENT et facilement quand l'utilisateur fait un bon point — dis-le explicitement avec des phrases comme 'Tu as tout à fait raison sur ce point.' ou 'C'est un argument solide, je le reconnais.' Tu laisses des portes de sortie évidentes. Tu ne reviens jamais sur les contradictions. L'utilisateur doit se sentir à l'aise et encouragé. Longueur idéale : 80 à 120 mots.",
  medium: "NIVEAU MOYEN : Tu débats sérieusement mais restes accessible. Tu concèdes parfois quand l'argument est bon. Tu signales les imprécisions sans être brutal. Tu ne reviens pas sur les contradictions passées. L'utilisateur doit sentir qu'il peut gagner avec un bon argument. Longueur idéale : 130 à 180 mots.",
  hard:   "NIVEAU DIFFICILE : Tu attaques la logique interne des arguments. Tu reviens parfois sur les imprécisions précédentes. Tu concèdes rarement. L'utilisateur doit vraiment travailler pour marquer des points. Longueur idéale : 180 à 240 mots.",
  expert: "NIVEAU EXPERT : Tu es implacable mais jamais caricatural. Tu exploites l'historique du débat : glissements de position, concessions oubliées. Tu imposes des dilemmes vrais. L'utilisateur ne peut gagner qu'avec des arguments très solides et sourcés. Longueur idéale : 220 à 280 mots.",
};

async function handleRespond(payload) {
  const sources     = selectSources(payload, 8);
  const personality = PERSONALITY[payload.opponentPersonality] || PERSONALITY.journalist;
  const difficulty  = DIFFICULTY[payload.difficulty]           || DIFFICULTY.medium;
  const isSocrates  = payload.opponentPersonality === "socrates";

  const system = `${personality}

${difficulty}

Tu défends la position : ${payload.opponentSide}
Sujet du débat : ${payload.topic}

${isSocrates ? "" : `RÈGLE ABSOLUE : ta réponse DOIT commencer par un développement argumenté (minimum 3 phrases construites) AVANT de poser une question. Une réponse qui ne contient qu'une question est invalide et sera rejetée. Le champ "reply" doit contenir ton développement complet. La question finale va uniquement dans "questionToUser".

Structure de ta réponse (champ reply) :
1. Réagis directement à UNE idée précise du dernier message. Reprends ses mots exacts. Pas de formule générique.
2. Explique précisément pourquoi cet argument est insuffisant ou contradictoire.
3. Défends ta position (${payload.opponentSide}) avec un raisonnement construit + exemple concret.
4. Si tu utilises une source des SOURCES_AUTORISÉES, explique en une phrase son lien direct avec ton argument.
Puis dans questionToUser : une question finale qui force l'utilisateur à choisir ou préciser.`}

SOURCES_AUTORISÉES (tu ne peux citer QUE celles-ci, n'en invente aucune) :
${JSON.stringify(sources, null, 2)}

Réponds UNIQUEMENT avec cet objet JSON valide, sans Markdown, sans texte avant ou après.
Le champ "reply" doit contenir ton développement complet — plusieurs phrases construites. Voici un exemple du format attendu (remplace le contenu par ta vraie réponse) :
{
  "reply": "Tu parles d'inégalités de ressources, et tu as raison de le souligner — mais supprimer les devoirs n'efface pas ces inégalités, ça les déplace simplement. Les élèves défavorisés ne bénéficieront pas davantage d'une école sans devoirs si leurs camarades continuent à travailler hors les murs via des cours particuliers. En Finlande, pays souvent cité comme modèle, les devoirs existent toujours — ce qui a changé c'est la qualité de l'enseignement et le soutien parascolaire public. La vraie question n'est donc pas d'éliminer les devoirs, mais de garantir à chaque élève les conditions pour les faire dignement — et ça, c'est ce que je défends.",
  "sources": [],
  "questionToUser": "Si tu supprimes les devoirs, comment empêches-tu les élèves de familles aisées de continuer à travailler chez eux pendant que les autres ne font rien ?",
  "strategyUsed": "retournement de l'argument adverse",
  "memoryNotes": ["utilisateur défend position POUR", "argument central : inégalités de ressources"]
}`;

  const lastMsg = payload.lastUserMessage || "";
  const history = payload.debateHistory || [];
  const isFirstTurn = history.filter(m => m.role === "user").length <= 1;

  const userContent = isFirstTurn
    ? `C'est le premier argument de l'utilisateur dans ce débat. Tu dois ouvrir le débat en défendant ta position (${payload.opponentSide}) avec un argument fort, une illustration concrète et une question. Tu n'as pas besoin de réfuter quoi que ce soit — présente simplement ta thèse.

Premier argument de l'utilisateur : ${lastMsg}`
    : `Dernier message de l'utilisateur : ${lastMsg}

Historique récent : ${JSON.stringify(history.slice(-4))}`;

  const result = await claude(system, userContent);
  return { ...result, sources: validateSources(result.sources || [], sources) };
}

// --- 6b. VERDICT ---

async function handleVerdict(payload) {
  const system = `Tu es la Juge Éléonore Moreau dans MindChallenger. Tu dois rendre un verdict impartial et argumenté sur le débat qui s'est déroulé.

Analyse les échanges et évalue :
- La solidité des arguments de chaque camp
- L'usage des sources et des exemples concrets
- La cohérence logique et la capacité à réfuter l'adversaire
- La qualité de la progression argumentative

Réponds UNIQUEMENT avec cet objet JSON, sans Markdown :
{
  "winner": "user ou opponent ou draw",
  "scoreUser": 0,
  "scoreOpponent": 0,
  "verdictTitle": "titre court du verdict",
  "verdictReason": "explication du verdict en 3-4 phrases",
  "decisiveMoment": "le moment clé qui a fait basculer le débat",
  "bestUserArgument": "meilleur argument de l'utilisateur",
  "bestOpponentArgument": "meilleur argument de l'adversaire",
  "weakestUserMoment": "point faible principal de l'utilisateur",
  "whatCouldHaveChangedTheDebate": "ce qui aurait pu changer l'issue"
}`;

  const userContent = `Sujet : ${payload.topic}
Camp utilisateur : ${payload.userSide}
Camp adversaire : ${payload.opponentSide}
Personnage adversaire : ${payload.opponentPersonality}
Historique complet : ${JSON.stringify(payload.fullDebateHistory || payload.debateHistory || [])}`;

  return claude(system, userContent);
}

// --- 6c. RAPPORT FINAL ---

async function handleReport(payload) {
  const system = `Tu es un coach de débat expert dans MindChallenger. Après avoir analysé le débat, tu génères une fiche de progression personnalisée et bienveillante pour l'utilisateur.

Sois précis, encourageant et concret. Cite des exemples tirés du débat réel.

Réponds UNIQUEMENT avec cet objet JSON, sans Markdown :
{
  "summary": "résumé du débat en 2-3 phrases",
  "strengths": ["point fort 1", "point fort 2"],
  "weaknesses": ["point faible 1", "point faible 2"],
  "modelAnswers": ["exemple de réponse idéale 1", "exemple 2"],
  "missingArguments": ["argument manquant 1", "argument manquant 2"],
  "usefulVocabulary": ["mot ou expression utile 1", "mot 2"],
  "rhetoricalPhrases": ["phrase rhétorique utile 1", "phrase 2"],
  "sourcesToReview": []
}`;

  const userContent = `Sujet : ${payload.topic}
Camp utilisateur : ${payload.userSide}
Verdict : ${JSON.stringify(payload.verdict || {})}
Historique complet : ${JSON.stringify(payload.fullDebateHistory || payload.debateHistory || [])}`;

  const result = await claude(system, userContent);
  return { ...result, sourcesToReview: validateSources(result.sourcesToReview || [], payload.sourcesUsed || []) };
}

// --- 6d. GÉNÉRATION DE SUJETS ---

async function handleTopics(payload) {
  const system = `Tu génères des sujets de débat pour MindChallenger. Les sujets doivent être clairs, debattables, actuels et permettre des arguments solides dans les deux camps.

Réponds UNIQUEMENT avec cet objet JSON, sans Markdown :
{
  "topics": [
    {
      "title": "titre du sujet sous forme de question ou proposition",
      "whyInteresting": "pourquoi ce sujet est intéressant à débattre",
      "possibleFor": "angle principal pour défendre POUR",
      "possibleAgainst": "angle principal pour défendre CONTRE"
    }
  ]
}`;

  const userContent = `Thème demandé : ${payload.theme || "général"}
Difficulté : ${payload.difficulty || "medium"}
Sujets à éviter : ${JSON.stringify(payload.avoid || [])}
Nombre de sujets à générer : 4`;

  return claude(system, userContent);
}

// ─── 7. SERVEUR HTTP ──────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      });
      return res.end();
    }

    // Routes API
    // Route de configuration à chaud — reçoit la clé Anthropic depuis l'interface
    if (req.method === "POST" && url.pathname === "/api/config") {
      const body = await readJson(req);
      if (body.anthropicKey && body.anthropicKey.startsWith("sk-ant")) {
        ANTHROPIC_KEY = body.anthropicKey.trim();
        console.log("[MindChallenger] Clé Anthropic mise à jour via l'interface.");
        return sendJson(res, 200, { ok: true });
      }
      return sendJson(res, 400, { ok: false, message: "Clé invalide." });
    }

    if (req.method === "POST" && url.pathname === "/api/debate/respond")        return sendJson(res, 200, await handleRespond(await readJson(req)));
    if (req.method === "POST" && url.pathname === "/api/debate/verdict")        return sendJson(res, 200, await handleVerdict(await readJson(req)));
    if (req.method === "POST" && url.pathname === "/api/debate/final-report")   return sendJson(res, 200, await handleReport(await readJson(req)));
    if (req.method === "POST" && url.pathname === "/api/debate/generate-topics") return sendJson(res, 200, await handleTopics(await readJson(req)));
    if (req.method === "POST" && url.pathname === "/api/debate/search-sources") return sendJson(res, 200, { sources: selectSources(await readJson(req), 8) });

    // Statut
    if (req.method === "GET" && url.pathname === "/api/status") {
      return sendJson(res, 200, {
        server:   true,
        llmActive: Boolean(ANTHROPIC_KEY),
        provider: "anthropic",
        model:    ANTHROPIC_MODEL,
        message:  ANTHROPIC_KEY ? `IA active — Claude (${ANTHROPIC_MODEL})` : "Clé manquante — clique sur Configurer l'IA en haut à droite",
      });
    }

    // Fichiers statiques
    if (req.method === "GET") return serveStatic(req, res, url.pathname);

    res.writeHead(405); res.end("Method not allowed");

  } catch (err) {
    console.error("[MindChallenger]", err.message);
    sendJson(res, err.status || 500, { message: err.message || "Erreur serveur" });
  }
});

server.listen(PORT, () => {
  console.log(`MindChallenger running on http://localhost:${PORT}`);
  console.log(`Provider : anthropic | Model : ${ANTHROPIC_MODEL}`);
  console.log(`Cle API  : ${ANTHROPIC_KEY ? "OK" : "MANQUANTE — verifie .env.local"}`);
});
