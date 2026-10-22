import type { FeedItem } from "../schemas";
import { articlePath } from "./articles";

export type RelatedEntry = { title: string; path: string; createdAt: string; format: NonNullable<FeedItem["editorial"]>["format"] };
export type RelatedReading = { topic: string; newer?: RelatedEntry; older?: RelatedEntry; more: RelatedEntry[] };
export const RELATED_LIMIT = 4;

const entry = (item: FeedItem, base: string): RelatedEntry => ({
  title: item.title ?? "Article", path: articlePath(item, base), createdAt: item.createdAt, format: item.editorial!.format,
});

/**
 * Titles and addresses only: spoiler-safe headlines, never bodies. `topicArticles`
 * must be sorted newest first; "more" holds the nearest neighbours beyond newer/older.
 */
export function relatedReading(item: FeedItem, topicArticles: FeedItem[], base: string): RelatedReading {
  const index = topicArticles.findIndex(candidate => candidate.id === item.id);
  if (index < 0) return { topic: item.community, more: [] };
  const newer = topicArticles[index - 1];
  const older = topicArticles[index + 1];
  const more: FeedItem[] = [];
  for (let distance = 2; more.length < RELATED_LIMIT && (index - distance >= 0 || index + distance < topicArticles.length); distance++) {
    for (const candidate of [topicArticles[index + distance], topicArticles[index - distance]]) {
      if (candidate && more.length < RELATED_LIMIT) more.push(candidate);
    }
  }
  more.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  return {
    topic: item.community,
    ...(newer ? { newer: entry(newer, base) } : {}),
    ...(older ? { older: entry(older, base) } : {}),
    more: more.map(candidate => entry(candidate, base)),
  };
}
