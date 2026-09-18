import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { plainText, readBounded, type SourcePacket } from "./sources";

// Deliberate reading shelf: factual background and criticism, never current news.
// Add URLs here as the shelf is reviewed; covered URLs are filtered by generate.ts.
export const EVERGREEN_SOURCES = [
  // WP2 source pilot: reviewed extraction AND numbered evidence; see docs/editorial-depth.md.
  {"topic": "greek_roman_mythology", "publisher": "The Metropolitan Museum of Art", "title": "Theater in Ancient Greece", "url": "https://www.metmuseum.org/essays/theater-in-ancient-greece"},
  {"topic": "greek_roman_mythology", "publisher": "The Metropolitan Museum of Art", "title": "Death, Burial, and the Afterlife in Ancient Greece", "url": "https://www.metmuseum.org/essays/death-burial-and-the-afterlife-in-ancient-greece"},
  {"topic": "greek_roman_mythology", "publisher": "The Metropolitan Museum of Art", "title": "Mystery Cults in the Greek and Roman World", "url": "https://www.metmuseum.org/essays/mystery-cults-in-the-greek-and-roman-world"},
  {"topic": "movies", "publisher": "Stanford Encyclopedia of Philosophy", "title": "The Paradox of Suspense", "url": "https://plato.stanford.edu/entries/paradox-suspense/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Philosophy of Humor", "url": "https://plato.stanford.edu/entries/humor/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Fiction", "url": "https://plato.stanford.edu/entries/fiction/"},
  {"topic": "economics", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Public Goods", "url": "https://plato.stanford.edu/entries/public-goods/"},
  {"topic": "greek_roman_mythology", "publisher": "The Metropolitan Museum of Art", "title": "Roman Sarcophagi", "url": "https://www.metmuseum.org/essays/roman-sarcophagi"},
  {"topic": "greek_roman_mythology", "publisher": "The Metropolitan Museum of Art", "title": "Roman Copies of Greek Statues", "url": "https://www.metmuseum.org/essays/roman-copies-of-greek-statues"},

  // Retrieved and checked for usable article prose for the twenty-post rollout.
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Existentialism", "url": "https://plato.stanford.edu/entries/existentialism/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Distributive Justice", "url": "https://plato.stanford.edu/entries/justice-distributive/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Seneca", "url": "https://plato.stanford.edu/entries/seneca/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Epictetus", "url": "https://plato.stanford.edu/entries/epictetus/"},
  {"topic": "economics", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Decision Theory", "url": "https://plato.stanford.edu/entries/decision-theory/"},
  {"topic": "economics", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Markets", "url": "https://plato.stanford.edu/entries/markets/"},
  {"topic": "movies", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Philosophy of Film", "url": "https://plato.stanford.edu/entries/film/"},

  // Additional publisher pages checked during the September 17 planning implementation.
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Epicurus", "url": "https://plato.stanford.edu/entries/epicurus/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Niccolò Machiavelli", "url": "https://plato.stanford.edu/entries/machiavelli/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Aristotle’s Ethics", "url": "https://plato.stanford.edu/entries/aristotle-ethics/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Plato", "url": "https://plato.stanford.edu/entries/plato/"},
  {"topic": "economics", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Game Theory", "url": "https://plato.stanford.edu/entries/game-theory/"},
  {"topic": "economics", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Prisoner’s Dilemma", "url": "https://plato.stanford.edu/entries/prisoner-dilemma/"},
  {"topic": "greek_roman_mythology", "publisher": "World History Encyclopedia", "title": "Prometheus", "url": "https://www.worldhistory.org/Prometheus/"},
  {"topic": "greek_roman_mythology", "publisher": "World History Encyclopedia", "title": "Medusa", "url": "https://www.worldhistory.org/Medusa/"},
  {"topic": "philosophy", "publisher": "World History Encyclopedia", "title": "Marcus Aurelius", "url": "https://www.worldhistory.org/Marcus_Aurelius/"},

  { topic: "the_sopranos", publisher: "BFI", title: "TV's a crowd", url: "https://www.bfi.org.uk/sight-and-sound/features/tvs-crowd" },
  { topic: "the_sopranos", publisher: "BFI", title: "The Many Saints of Newark and the baggage of The Sopranos", url: "https://www.bfi.org.uk/sight-and-sound/reviews/many-saints-newark-cant-escape-baggage-sopranos" },
  { topic: "movies", publisher: "BFI", title: "10 great films about television", url: "https://www.bfi.org.uk/lists/10-great-films-about-television" },
  { topic: "greek_roman_mythology", publisher: "World History Encyclopedia", title: "Greek Mythology", url: "https://www.worldhistory.org/Greek_Mythology/" },
  { topic: "greek_roman_mythology", publisher: "World History Encyclopedia", title: "Roman Mythology", url: "https://www.worldhistory.org/Roman_Mythology/" },
  { topic: "greek_roman_mythology", publisher: "World History Encyclopedia", title: "Mythology", url: "https://www.worldhistory.org/mythology/" },
  { topic: "philosophy", publisher: "Stanford Encyclopedia of Philosophy", title: "Stoicism", url: "https://plato.stanford.edu/entries/stoicism/" },
  { topic: "philosophy", publisher: "Stanford Encyclopedia of Philosophy", title: "Marcus Aurelius", url: "https://plato.stanford.edu/entries/marcus-aurelius/" },
  { topic: "economics", publisher: "Stanford Encyclopedia of Philosophy", title: "Philosophy of Economics", url: "https://plato.stanford.edu/entries/economics/" },
  // Retrieved September 18: usable prose confirmed with articleExcerpt; background only.
  {"topic":"philosophy","publisher":"Stanford Encyclopedia of Philosophy","title":"Free Will","url":"https://plato.stanford.edu/entries/freewill/"},
  {"topic":"philosophy","publisher":"Stanford Encyclopedia of Philosophy","title":"Friedrich Nietzsche","url":"https://plato.stanford.edu/entries/nietzsche/"},
  {"topic":"philosophy","publisher":"Stanford Encyclopedia of Philosophy","title":"Albert Camus","url":"https://plato.stanford.edu/entries/camus/"},
  {"topic":"philosophy","publisher":"Stanford Encyclopedia of Philosophy","title":"David Hume","url":"https://plato.stanford.edu/entries/hume/"},
  {"topic":"philosophy","publisher":"Stanford Encyclopedia of Philosophy","title":"Skepticism","url":"https://plato.stanford.edu/entries/skepticism/"},
  {"topic":"philosophy","publisher":"Stanford Encyclopedia of Philosophy","title":"Well-Being","url":"https://plato.stanford.edu/entries/well-being/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Socrates","url":"https://iep.utm.edu/socrates/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Aristotle: Ethics","url":"https://iep.utm.edu/aristotle-ethics/"},
  {"topic":"science","publisher":"NASA","title":"Black Holes","url":"https://science.nasa.gov/universe/black-holes/"},
  {"topic":"science","publisher":"NASA","title":"Asteroids","url":"https://science.nasa.gov/solar-system/asteroids/"},
  {"topic":"science","publisher":"NASA","title":"Comets","url":"https://science.nasa.gov/solar-system/comets/"},
  {"topic":"science","publisher":"NASA","title":"Exoplanets","url":"https://science.nasa.gov/exoplanets/"},
  {"topic":"greek_roman_mythology","publisher":"The Metropolitan Museum of Art","title":"Greek Gods and Religious Practices","url":"https://www.metmuseum.org/essays/greek-gods-and-religious-practices"},
  {"topic":"greek_roman_mythology","publisher":"The Metropolitan Museum of Art","title":"Greek Art in the Archaic Period","url":"https://www.metmuseum.org/essays/greek-art-in-the-archaic-period"},
  {"topic":"science","publisher":"NASA","title":"Dark Matter","url":"https://science.nasa.gov/dark-matter/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Aesthetics","url":"https://iep.utm.edu/aesthetics/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Solipsism and the Problem of Other Minds","url":"https://iep.utm.edu/solipsis/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Hedonism","url":"https://iep.utm.edu/hedonism/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Paradox of Hedonism","url":"https://iep.utm.edu/paradox-of-hedonism/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Time","url":"https://iep.utm.edu/time/"},
  {"topic":"movies","publisher":"Internet Encyclopedia of Philosophy","title":"Philosophy of Film: Continental Perspectives","url":"https://iep.utm.edu/filmcont/"},
  {"topic":"economics","publisher":"Stanford Encyclopedia of Philosophy","title":"Social Choice Theory","url":"https://plato.stanford.edu/entries/social-choice/"},
  {"topic":"economics","publisher":"Stanford Encyclopedia of Philosophy","title":"Normative Theories of Rational Choice: Expected Utility","url":"https://plato.stanford.edu/entries/rationality-normative-utility/"},
  {"topic":"economics","publisher":"Stanford Encyclopedia of Philosophy","title":"Bounded Rationality","url":"https://plato.stanford.edu/entries/bounded-rationality/"},
  {"topic":"science","publisher":"NASA","title":"Titan","url":"https://science.nasa.gov/saturn/moons/titan/"},
];

type HtmlNode = Record<string, unknown> & { ":@"?: Record<string, string> };
const htmlParser = new XMLParser({
  preserveOrder: true, ignoreAttributes: false, parseTagValue: false,
  processEntities: false, trimValues: false,
  unpairedTags: ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"],
  stopNodes: ["*.script", "*.style"],
});
const ignoredTags = new Set(["script", "style", "nav", "header", "footer", "aside", "form", "figure", "figcaption", "noscript"]);
const tagOf = (node: HtmlNode) => Object.keys(node).find(key => key !== ":@") ?? "";
const childrenOf = (node: HtmlNode): HtmlNode[] => {
  const children = node[tagOf(node)];
  return Array.isArray(children) ? children : [];
};
const hasClass = (node: HtmlNode, name: string) => (node[":@"]?.["@_class"] ?? "").split(/\s+/).includes(name);
const ignored = (node: HtmlNode) => ignoredTags.has(tagOf(node)) ||
  /(?:^|[\s_-])(?:related|teaser|card|promo|recommendations?|newsletter|social|share)(?:[\s_-]|$)/i
    .test(`${node[":@"]?.["@_class"] ?? ""} ${node[":@"]?.["@_id"] ?? ""}`);

function findElement(nodes: HtmlNode[], predicate: (node: HtmlNode) => boolean): HtmlNode | undefined {
  for (const node of nodes) {
    if (ignored(node)) continue;
    if (predicate(node)) return node;
    const found = findElement(childrenOf(node), predicate);
    if (found) return found;
  }
}

function elementText(node: HtmlNode): string {
  if (ignored(node)) return "";
  if (tagOf(node) === "#text") return String(node["#text"] ?? "");
  if (tagOf(node) === "br") return " ";
  return childrenOf(node).map(elementText).join("");
}

/** Select one coherent prose section. Page modules and their teaser prose are not an article. */
export function articleExcerpt(html: string): string {
  if (html.length > 1_000_000) return "";
  // Ordinary HTML doctype is harmless; never allow DTDs or entity declarations.
  const cleaned = html.replace(/<!doctype\s+html\s*>/gi, "");
  if (/<!DOCTYPE|<!ENTITY/i.test(cleaned)) return "";
  try {
    const nodes = htmlParser.parse(cleaned) as HtmlNode[];
    const stanford = findElement(nodes, node => node[":@"]?.["@_id"] === "aueditable");
    const article = findElement(nodes, node => tagOf(node) === "article");
    const root = stanford
      ? findElement(childrenOf(stanford), node => node[":@"]?.["@_id"] === "main-text") ?? stanford
      : article && (findElement(childrenOf(article), node => hasClass(node, "entry-content")) ?? article);
    if (!root) return "";
    const sections: string[][] = [[]];
    const boundary = () => { if (sections.at(-1)!.length) sections.push([]); };
    const addParagraph = (node: HtmlNode) => {
      const text = plainText(elementText(node));
      // Truncated teaser sentences are never expanded into a purported full article.
      if (text && !/(?:…|\.\.\.)[”"')\]]?$/.test(text)) sections.at(-1)!.push(text);
      else if (text) boundary();
    };
    if (article && hasClass(article, "type-topic")) {
      // NASA topic pages interleave independently linked stories and fact cards.
      // Only their direct WordPress prose is eligible; never flatten nested modules.
      for (const node of childrenOf(root)) {
        if (tagOf(node) === "#text" && !String(node["#text"] ?? "").trim()) continue;
        if (tagOf(node) === "p" && hasClass(node, "wp-block-paragraph")) addParagraph(node);
        else boundary();
      }
    } else {
      const walk = (children: HtmlNode[]) => {
        for (const node of children) {
          const tag = tagOf(node);
          if (ignored(node) || tag === "article" || node[":@"]?.["@_id"] === "bibliography") { boundary(); continue; }
          if (/^h[1-6]$/.test(tag) || tag === "section") boundary();
          if (tag === "p") addParagraph(node);
          else walk(childrenOf(node));
          if (tag === "section") boundary();
        }
      };
      walk(childrenOf(root));
    }
    const section = sections.find(paragraphs => paragraphs.join("\n\n").length >= 300)
      ?? sections.find(paragraphs => paragraphs.length);
    if (!section) return "";
    // Keep complete paragraphs at the existing 6,000-character cap.
    const bounded: string[] = [];
    for (const paragraph of section) {
      if ([...bounded, paragraph].join("\n\n").length > 6000) break;
      bounded.push(paragraph);
    }
    return bounded.join("\n\n");
  } catch {
    // Known source layouts can change; skip unreadable HTML instead of using page chrome.
    return "";
  }
}

export async function collectEvergreen(now: Date, fetchImpl: typeof fetch, coveredUrls: ReadonlySet<string> = new Set()): Promise<SourcePacket[]> {
  const shelf = EVERGREEN_SOURCES.filter(source => !coveredUrls.has(source.url));
  console.log(`[sources] Evergreen shelf: ${shelf.length}/${EVERGREEN_SOURCES.length} unconsumed articles`);
  const results = await Promise.allSettled(shelf.map(async (source) => {
    const response = await fetchImpl(source.url, {
      signal: AbortSignal.timeout(20_000), redirect: "error",
      headers: { Accept: "text/html" },
    });
    const excerpt = articleExcerpt(await readBounded(response));
    if (excerpt.length < 300) throw new Error("Insufficient article prose");
    return {
      ...source, excerpt, evergreen: true,
      id: createHash("sha256").update(source.url).digest("hex").slice(0, 16),
      retrievedAt: now.toISOString(),
      // A retrieval date must never masquerade as a publication date.
    } satisfies SourcePacket;
  }));
  return results.flatMap((result, index) => {
    if (result.status === "fulfilled") return [result.value];
    console.warn(`[sources] Evergreen article unavailable: ${shelf[index].title}; skipping`);
    return [];
  });
}
