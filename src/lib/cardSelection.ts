import type { FeedItem } from "../../schemas";

export type CardAction = "next" | "different";
/** Prefer a new topic without treating Next as a like or storing topic preferences. */
export function selectCard(items: FeedItem[], seen: ReadonlySet<string>, current: FeedItem | null, action: CardAction): FeedItem | undefined {
  const eligible = items.filter(item => item.editorial && item.id !== current?.id && !seen.has(item.id));
  const different = eligible.find(item => item.community !== current?.community);
  return action === "different" ? different : different ?? eligible[0];
}

export const CARD_HISTORY_KEY = "openfeed-cards-seen-v1";
export const MAX_SEEN_CARDS = 10_000;
export function readSeenCards(): Set<string> {
  const parsed: unknown = JSON.parse(localStorage.getItem(CARD_HISTORY_KEY) ?? "null");
  if (!parsed || typeof parsed !== "object" || !("version" in parsed) || parsed.version !== 1 || !("ids" in parsed) || !Array.isArray(parsed.ids)) return new Set();
  return new Set(parsed.ids.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 256).slice(-MAX_SEEN_CARDS));
}
export function persistSeenCards(ids: ReadonlySet<string>): void {
  let other = new Set<string>();
  try { other = readSeenCards(); } catch { /* Replace corrupt storage, when writable. */ }
  localStorage.setItem(CARD_HISTORY_KEY, JSON.stringify({ version: 1, ids: [...new Set([...other, ...ids])].slice(-MAX_SEEN_CARDS) }));
}
