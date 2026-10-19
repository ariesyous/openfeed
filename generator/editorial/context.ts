import { hasArticleAdapter, sourceArticleSections } from "./articleText";
import { coverageTitle } from "./coverage";
import { readBounded, SOURCE_FEEDS, type SourcePacket } from "./sources";

export const MAX_ARTICLE_FETCHES = 72;
export const MAX_PUBLISHER_CANDIDATES = 6;
export const ARTICLE_FETCH_CONCURRENCY = 4;
const publisherKey = (name: string) => name.startsWith("BBC") ? "BBC" : name;

export function contextCandidates(packets: SourcePacket[]): SourcePacket[] {
  const topics = new Map<string, SourcePacket[]>();
  for (const packet of packets) {
    if (!hasArticleAdapter(packet.publisher) && packet.contextKind !== "feed_article") continue;
    const group = topics.get(packet.topic) ?? [];
    group.push(packet); topics.set(packet.topic, group);
  }
  for (const group of topics.values()) group.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  const selected: SourcePacket[] = [], publishers = new Map<string, number>();
  const titles = new Set<string>();
  for (let round = 0; selected.length < MAX_ARTICLE_FETCHES; round++) {
    let present = false;
    for (const group of topics.values()) {
      const packet = group[round];
      if (!packet) continue;
      present = true;
      const key = publisherKey(packet.publisher), title = coverageTitle(packet.title);
      if (titles.has(title) || (publishers.get(key) ?? 0) >= MAX_PUBLISHER_CANDIDATES) continue;
      selected.push(packet); titles.add(title); publishers.set(key, (publishers.get(key) ?? 0) + 1);
      if (selected.length === MAX_ARTICLE_FETCHES) break;
    }
    if (!present) break;
  }
  return selected;
}

/** Only feed-discovered, publisher-validated HTTPS URLs; no crawling or redirects. */
export async function collectArticleContext(packets: SourcePacket[], fetchImpl: typeof fetch): Promise<SourcePacket[]> {
  const selected = contextCandidates(packets);
  const accepted: SourcePacket[] = [];
  for (let offset = 0; offset < selected.length; offset += ARTICLE_FETCH_CONCURRENCY) {
    const results = await Promise.allSettled(selected.slice(offset, offset + ARTICLE_FETCH_CONCURRENCY).map(async packet => {
      const url = new URL(packet.url);
      const feed = SOURCE_FEEDS.find(feed => feed.publisher === packet.publisher && feed.hosts.some(host =>
        url.hostname === host || url.hostname.endsWith(`.${host}`)));
      if (!feed || url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("Unapproved article URL");
      // Full feed content is usable; descriptions alone never substitute for a page.
      if (packet.contextKind === "feed_article" && packet.excerpt.length >= 300) return packet;
      const response = await fetchImpl(packet.url, {
        redirect: "error", signal: AbortSignal.timeout(20_000), headers: { Accept: "text/html" },
      });
      const sections = sourceArticleSections(await readBounded(response), packet.publisher);
      const excerpt = sections.join("\n\n");
      if (excerpt.length < 300) throw new Error("No coherent article section");
      return { ...packet, excerpt, sections, contextKind: "article" as const };
    }));
    for (const result of results) if (result.status === "fulfilled") accepted.push(result.value);
  }
  console.log(`[sources] article context: candidates=${packets.length} selected=${selected.length} accepted=${accepted.length} skipped=${selected.length - accepted.length}`);
  return accepted;
}
