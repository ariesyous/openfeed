/** Exact normalized source headlines catch common syndicated repeats across URLs.
 * This is deliberately not a claim of semantic event-level deduplication. */
export function coverageTitle(title: string): string {
  return title.normalize("NFKC").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const CONVERSATION_HOSTS = new Set(["theconversation.com", "www.theconversation.com"]);
const DW_HOSTS = new Set(["dw.com", "www.dw.com"]);

/** Durable URL coverage key. The Conversation and Deutsche Welle republish one
 * article under new slugs while keeping its numeric ID (`-<digits>` and `/a-<digits>`
 * respectively), so their article URLs key on that ID, ignoring the query string.
 * Every other URL stays its own key; this is not general URL canonicalization. */
export function coverageUrl(url: string): string {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return url; }
  const id = CONVERSATION_HOSTS.has(parsed.hostname) ? /^\/[a-z0-9-]+-(\d+)\/?$/i.exec(parsed.pathname)?.[1] : undefined;
  if (id) return `theconversation.com#article-${id}`;
  const dwId = DW_HOSTS.has(parsed.hostname) ? /\/a-(\d+)\/?$/.exec(parsed.pathname)?.[1] : undefined;
  return dwId ? `dw.com#a-${dwId}` : url;
}

/** Derived from the stored URLs, so existing state needs no migration. */
export function coveredUrlKeys(urls: Iterable<string>): Set<string> {
  return new Set([...urls].map(coverageUrl));
}
