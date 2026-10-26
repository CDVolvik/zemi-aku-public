// The conversational side of the agent: greetings, "how are you", "what can you do", thanks,
// goodbye, and a guiding question when a plan has no town yet ("dinner tonight"). Everything
// else goes on to the records. When the Claude brain lands, open questions go there instead.
import { fold } from "./lib.mjs";

// Folded text: lowercase, no accents, punctuation as spaces ("¿Cómo está?" → "como esta").
const clean = (text) => ` ${fold(text).replace(/[^a-z0-9]+/g, " ").trim()} `;

const KINDS = [
  ["how", /\b(how are you|how s it going|how is it going|how you doing|how are things|como estas|como esta|que tal|como te va|como le va|comment ca va|comment allez vous|comment vas tu|ca va|come stai|come sta|come va|wie geht s|wie geht es|wie gehts)\b/],
  ["who", /\b(who are you|what are you|what s your name|what is your name|quien eres|quien es usted|como te llamas|como se llama|qui es tu|qui etes vous|chi sei|chi e lei|come ti chiami|wer bist du|wer sind sie|wie hei)\b/],
  ["help", /\b(help|what can you do|what can i ask|what do you do|how does this work|ayuda|que puedes hacer|que puede hacer|que le puedo preguntar|aide|que peux tu faire|que pouvez vous faire|aiuto|cosa sai fare|cosa puoi fare|hilfe|was kannst du|was konnen sie)\b/],
  ["thanks", /\b(thanks|thank you|thx|gracias|merci|grazie|danke)\b/],
  ["bye", /\b(bye|goodbye|see you|good night|adios|hasta luego|hasta pronto|au revoir|arrivederci|tschuss|auf wiedersehen)\b/],
  ["greet", /\b(hi|hello|hey|hiya|good morning|good afternoon|good evening|greetings|hola|buenos dias|buenas tardes|buenas noches|buenas|saludos|bonjour|salut|bonsoir|ciao|buongiorno|buonasera|salve|hallo|guten morgen|guten tag|guten abend|servus|moin)\b/],
];
const YES = /^ (yes|yeah|yep|sure|ok|okay|si|claro|dale|oui|certo|ja|genau) $/;
// An ask with no kind of place and no purpose gets one question back before the model or the records
// (judge panels 10/24: "¿Dónde está lo bueno?" came back as food in the open town). Bounded forms only.
const VAGUE = /^ (where s the good stuff|where is the good stuff|what s good|what s good here|what s good around here|what s good there|anything good|anything good here|anything good around here|donde esta lo bueno|donde esta lo bueno por aqui|que hay de bueno|que hay de bueno por aqui|que hay bueno|que hay bueno por aqui|donde esta lo mejor|que es lo bueno|que es lo bueno de aqui) $/;
// A bare "¿Dónde?" or "What do you recommend?" is vague only at the start of a conversation (judge panel 10/26); after
// "a quiet dinner in Ponce" the model has the town and the purpose (Codex review, round ten).
const BARE = /^ (where|where exactly|and where|what|which|donde|donde exactamente|y donde|que|cual|what do you recommend|what do you recommend here|what do you recommend around here|any recommendations|que me recomiendas|que me recomienda|que me recomiendas por aqui|que me recomienda por aqui|que recomiendas|que recomienda) $/;
export function vagueKind(text, history = []) {
  const t = clean(text);
  // Context is an earlier real question: "Hello" or another bare "Where?" gives none (Codex review, round ten).
  const asked = (Array.isArray(history) ? history : []).some((turn) => {
    const said = turn?.role === "user" ? String(turn.content || "") : "";
    return said.trim() && !smallTalkKind(said) && !VAGUE.test(clean(said)) && !BARE.test(clean(said));
  });
  return VAGUE.test(t) || (BARE.test(t) && !asked) ? "vague" : null;
}

// Words that can sit around small talk without making it a question.
const FILLER = new Set(("zemi aku please por favor there today and you u i im m fine good great well doing very so oh "
  + "muy bien yo tambien y usted tu le ti dir ihnen vous et e und much so much mucho many many").split(" "));

// "Hi" is small talk; "Hi, where can I eat in Ponce?" is a question that happens to start with hi.
export function smallTalkKind(text) {
  const t = clean(text);
  if (YES.test(t)) return "yes";
  for (const [kind, pattern] of KINDS) {
    if (!pattern.test(t)) continue;
    const rest = t.replace(new RegExp(pattern.source, "g"), " ").split(" ")
      .filter((word) => word.length >= 3 && !FILLER.has(word));
    return rest.length <= 1 ? kind : null;
  }
  return null;
}

const GUIDES = [
  ["business", /\b(buy|buying|purchase|invest|investing|business|negocio|negocios|comprar|invertir|acheter|entreprise|comprare|attivita|kaufen|geschaft|unternehmen)\b/],
  ["dinner", /\b(dinner|lunch|breakfast|hungry|eat|eating|tonight|cenar|cena|almorzar|almuerzo|desayunar|desayuno|hambre|comer|diner|dejeuner|manger|cenare|pranzo|mangiare|fame|essen|abendessen|mittagessen|hunger)\b/],
];
const PLAN_WORDS = new Set(("i im m want to a an the am looking for some would like we are where can should maybe tonight today "
  + "something somewhere place get go have open start one quiero un una el la para estoy buscando donde puedo me gustaria "
  + "esta noche hoy vamos a algo algun lugar tengo abrir je veux un une ce soir ou voglio stasera dove ich mochte heute abend wo "
  + "ein eine etwas").split(" "));

// "Dinner tonight" with no town: ask which town. "Where can I eat mofongo" already says what it wants.
export function guideKind(text) {
  const t = clean(text);
  for (const [kind, pattern] of GUIDES) {
    if (!pattern.test(t)) continue;
    const rest = t.replace(new RegExp(pattern.source, "g"), " ").split(" ")
      .filter((word) => word.length >= 2 && !PLAN_WORDS.has(word) && !GUIDES.some(([, other]) => other.test(` ${word} `)));
    return rest.length ? null : kind;
  }
  return null;
}

const LOCALES = { en: "en-US", es: "en-US", fr: "fr-FR", it: "it-IT", de: "de-DE" };

const REPLIES = {
  en: {
    greet: () => "Hi, I’m Zemi-Aku. Let’s explore Puerto Rico together. Are you looking for somewhere to eat, a place to visit, or a town to get to know?",
    how: () => "I’m here and ready to explore with you. How are you doing?",
    who: (n) => `I'm Zemi-Aku, a map that thinks in Qloo's taste data. I know thousands of places across all 78 towns, and I only tell you what the records say. What would you like to explore?`,
    help: () => "Ask me anything about a town: where people eat in Ponce, hotels in Vieques, or who already does business in Mayagüez. You can name a dish, like mofongo, or a kind of place, like bakeries. Where shall we start?",
    thanks: () => "You’re welcome. Happy to help.",
    bye: () => "Hasta luego! Come back anytime; the island will be here.",
    yes: () => "Tell me the town you have in mind, and we’ll start there.",
    business: () => "Which town are you thinking about? I can help you explore the area and point you to business-sale directories.",
    dinner: () => "Sounds like a good night. Which town are you in? Tell me and I'll show you where people eat there, from bakeries to Puerto Rican restaurants.",
    vague: () => "What are you after: food, nightlife, beaches and outdoors, culture, or a business to open? Name that and a town, and I'll point to places with a record behind them.",
  },
  es: {
    greet: () => "Hola, soy Zemi-Aku. Vamos a explorar Puerto Rico. ¿Le gustaría buscar dónde comer, un lugar para visitar o conocer mejor algún pueblo?",
    how: () => "Aquí, lista para explorar con usted. ¿Cómo le va hoy?",
    vague: () => "¿Qué busca: comida, vida nocturna, playas y aire libre, cultura, o un negocio para abrir? Dígame eso y el pueblo, y le señalo lugares con registro.",
    who: (n) => `Soy Zemi-Aku, un mapa que piensa con los datos de gusto de Qloo. Conozco miles de lugares en los 78 pueblos y solo le digo lo que dicen los registros. ¿Qué quiere explorar?`,
    help: () => "Pregúnteme lo que quiera sobre un pueblo: dónde se come en Ponce, qué hoteles hay en Vieques o quién ya hace negocio en Mayagüez. También puede decir un plato, como mofongo, o un tipo de lugar, como panaderías. ¿Por dónde empezamos?",
    thanks: () => "Con mucho gusto.",
    bye: () => "¡Hasta luego! Vuelva cuando quiera; la isla va a estar aquí.",
    yes: () => "¡Perfecto! Dígame el pueblo y lo que busca, por ejemplo cena en Ponce o un negocio en Mayagüez.",
    business: () => "¿En qué pueblo está pensando? Le ayudo a explorar la zona y a encontrar directorios de negocios en venta.",
    dinner: () => "Buen plan. ¿En qué pueblo está? Dígamelo y le enseño dónde come la gente allí, desde panaderías hasta restaurantes puertorriqueños.",
  },
  fr: {
    greet: () => "Bonjour, je suis Zemi-Aku. Explorons Porto Rico ensemble. Vous cherchez un endroit où manger, une visite ou une ville à découvrir ?",
    how: () => "Très bien, merci de demander ! Toutes les villes sont chargées. Et vous, comment allez-vous ? Que puis-je chercher pour vous à Porto Rico ?",
    who: (n) => `Je suis Zemi-Aku, une carte qui pense avec les données de goût de Qloo. Je connais ${n} lieux dans les 78 villes, et je ne dis que ce que disent les fiches. Que voulez-vous explorer ?`,
    help: () => "Demandez-moi ce que vous voulez sur une ville : où l'on mange à Ponce, les hôtels de Vieques, ou qui fait déjà des affaires à Mayagüez. Les réponses complètes en français arrivent avec l'agent ; les fiches s'affichent en anglais. Par où commençons-nous ?",
    thanks: () => "Avec plaisir. Que voulez-vous savoir d'autre ?",
    bye: () => "Au revoir ! Revenez quand vous voulez ; l'île sera là.",
    yes: () => "Parfait. Dites-moi la ville et ce que vous cherchez, par exemple dîner à Ponce.",
    business: () => "Très bien. À quelle ville pensez-vous ? Je vous montre ce qui existe déjà, par catégorie.",
    dinner: () => "Bonne idée. Dans quelle ville êtes-vous ? Je vous montre où les gens mangent.",
  },
  it: {
    greet: () => "Ciao, sono Zemi-Aku. Esploriamo Porto Rico insieme. Cerca un posto dove mangiare, un luogo da visitare o un comune da conoscere?",
    how: () => "Benissimo, grazie! Tutti i comuni sono caricati. E lei come sta? Cosa posso cercare per lei a Porto Rico?",
    who: (n) => `Sono Zemi-Aku, una mappa che ragiona con i dati di gusto di Qloo. Conosco ${n} luoghi nei 78 comuni e dico solo quello che dicono le schede. Cosa vuole esplorare?`,
    help: () => "Mi chieda qualsiasi cosa su un comune: dove si mangia a Ponce, gli hotel di Vieques, chi fa già affari a Mayagüez. Le risposte complete in italiano arriveranno con l'agente; le schede sono in inglese. Da dove cominciamo?",
    thanks: () => "Con piacere. Cos'altro vuole sapere?",
    bye: () => "Arrivederci! Torni quando vuole; l'isola sarà qui.",
    yes: () => "Perfetto. Mi dica il comune e cosa cerca, per esempio cena a Ponce.",
    business: () => "Bene. A quale comune sta pensando? Le mostro cosa c'è già, per categoria.",
    dinner: () => "Ottima idea. In quale comune si trova? Le mostro dove mangia la gente.",
  },
  de: {
    greet: () => "Hallo, ich bin Zemi-Aku. Entdecken wir Puerto Rico gemeinsam. Suchen Sie ein Restaurant, ein Ausflugsziel oder eine Gemeinde zum Erkunden?",
    how: () => "Sehr gut, danke der Nachfrage! Alle Gemeinden sind geladen. Und wie geht es Ihnen? Was kann ich für Sie in Puerto Rico finden?",
    who: (n) => `Ich bin Zemi-Aku, eine Karte, die mit Qloos Geschmacksdaten denkt. Ich kenne ${n} Orte in allen 78 Gemeinden und sage nur, was in den Einträgen steht. Was möchten Sie erkunden?`,
    help: () => "Fragen Sie mich alles über eine Gemeinde: wo man in Ponce isst, Hotels in Vieques, wer in Mayagüez schon Geschäfte macht. Vollständige Antworten auf Deutsch kommen mit dem Agenten; die Karten sind auf Englisch. Wo fangen wir an?",
    thanks: () => "Gern geschehen. Was möchten Sie noch wissen?",
    bye: () => "Auf Wiedersehen! Kommen Sie jederzeit wieder; die Insel bleibt hier.",
    yes: () => "Wunderbar. Nennen Sie mir die Gemeinde und was Sie suchen, zum Beispiel Abendessen in Ponce.",
    business: () => "Gut. An welche Gemeinde denken Sie? Ich zeige Ihnen, was es dort schon gibt, nach Kategorie.",
    dinner: () => "Gute Idee. In welcher Gemeinde sind Sie? Ich zeige Ihnen, wo die Leute essen.",
  },
};

// facts.places: how many places the catalog holds (data/catalog-counts.json).
export function chatReply(lang, kind, facts = {}) {
  const table = REPLIES[lang] || REPLIES.en;
  const reply = table[kind] || REPLIES.en[kind];
  const count = Number(facts.places || 0).toLocaleString(LOCALES[lang] || "en-US");
  return reply ? reply(count) : "";
}
