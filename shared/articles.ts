import type { FeedItem } from "../schemas";

type ArticleIdentity = Pick<FeedItem, "id" | "title" | "slug">;

// Stable, non-security identifier. The archive build rejects any route collision.
function shortId(id: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(id)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0").slice(-10);
}

function shortSlug(title: string, id: string): string {
  return `${title.slice(0, 60).replace(/-$/, "")}--${shortId(id)}`;
}

/** Stored at first publication; existing stored identities remain unchanged. */
export function articleSlug(item: Pick<FeedItem, "id" | "title" | "slug">): string {
  if (item.slug) return item.slug;
  const title = (item.title ?? "article").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70).replace(/-$/, "") || "article";
  return shortSlug(title, item.id);
}

/** Short sharing address, derived from the frozen slug rather than an edited title. */
export function articleRouteSlug(item: ArticleIdentity): string {
  const stored = articleSlug(item);
  const legacySuffix = Array.from(new TextEncoder().encode(item.id), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (!stored.endsWith(`--${legacySuffix}`)) return stored;
  return shortSlug(stored.slice(0, -(legacySuffix.length + 2)), item.id);
}

export function matchesArticleSlug(item: ArticleIdentity, slug: string): boolean {
  return slug === articleRouteSlug(item) || slug === articleSlug(item);
}

export function articlePath(item: ArticleIdentity, base = "/"): string {
  return `${base.replace(/\/$/, "")}/p/${articleRouteSlug(item)}/`;
}

export function withArticleSlug(item: FeedItem): FeedItem {
  return item.editorial ? { ...item, slug: articleSlug(item) } : item;
}
