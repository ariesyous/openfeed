/** Exact normalized source headlines catch common syndicated repeats across URLs.
 * This is deliberately not a claim of semantic event-level deduplication. */
export function coverageTitle(title: string): string {
  return title.normalize("NFKC").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
