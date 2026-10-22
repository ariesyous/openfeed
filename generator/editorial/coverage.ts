/** Exact normalized source headlines catch common syndicated repeats across URLs.
 * This is deliberately not a claim of semantic event-level deduplication. */
export function coverageTitle(title: string): string {
  return title.normalize("NFKC").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const CONVERSATION_HOSTS = new Set(["theconversation.com", "www.theconversation.com"]);

/** Durable URL coverage key. The Conversation republishes one article under new
 * slugs while keeping its trailing numeric ID, so its article URLs key on that ID.
 * Every other URL stays its own key; this is not general URL canonicalization. */
export function coverageUrl(url: string): string {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return url; }
  const id = CONVERSATION_HOSTS.has(parsed.hostname) ? /^\/[a-z0-9-]+-(\d+)\/?$/i.exec(parsed.pathname)?.[1] : undefined;
  return id ? `theconversation.com#article-${id}` : url;
}

/** Derived from the stored URLs, so existing state needs no migration. */
export function coveredUrlKeys(urls: Iterable<string>): Set<string> {
  return new Set([...urls].map(coverageUrl));
}
