import type { FeedItem } from "../schemas";
import { articlePath } from "./articles";
import { topicLabel } from "./topics";

/** [title, path, topic, format, addedAt, publishers]: headlines and metadata only, never bodies. */
export type SearchRow = [string, string, string, string, string, string];
export type SearchIndex = { version: 1; articles: SearchRow[] };

export function searchRow(item: FeedItem, base: string): SearchRow {
  const publishers = [...new Set(item.editorial!.sources.map(source => source.publisher))].join(", ");
  return [item.title ?? "Article", articlePath(item, base), item.community, item.editorial!.format, item.createdAt, publishers];
}

export const foldText = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
export const searchTokens = (query: string) => foldText(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Every query token must appear in the title, topic or publishers. Rows keep their newest-first order. */
export function searchArticles(rows: SearchRow[], query: string, filters: { topic?: string; format?: string } = {}): SearchRow[] {
  const tokens = searchTokens(query);
  return rows.filter(row => {
    if (filters.topic && row[2] !== filters.topic) return false;
    if (filters.format && row[3] !== filters.format) return false;
    if (!tokens.length) return Boolean(filters.topic || filters.format);
    const haystack = foldText(`${row[0]} ${topicLabel(row[2])} ${row[5]}`);
    return tokens.every(token => haystack.includes(token));
  });
}
