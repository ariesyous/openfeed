import { createHash } from "node:crypto";
import { plainText, readBounded, type SourcePacket } from "./sources";

// Deliberate reading shelf: factual background and criticism, never current news.
// Add URLs here as the shelf is reviewed; covered URLs are filtered by generate.ts.
export const EVERGREEN_SOURCES = [
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
];

export function articleExcerpt(html: string): string {
  // Only prose from a recognizable article container, never arbitrary page chrome.
  const cleaned = html.replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const article = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    ?? cleaned.match(/<div\b[^>]*id=["']aueditable["'][^>]*>([\s\S]*?)<div\b[^>]*id=["']bibliography/i)?.[1]
    ?? cleaned.match(/<div\b[^>]*id=["']main-text["'][^>]*>([\s\S]*)/i)?.[1];
  if (!article) return "";
  return [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => plainText(match[1]))
    .filter((text) => text.length >= 80)
    .join("\n\n").slice(0, 6000);
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
