import type { FeedItem } from "../schemas";

/** Stored at first publication. The ID suffix disambiguates identical headlines. */
export function articleSlug(item: Pick<FeedItem, "id" | "title" | "slug">): string {
  if (item.slug) return item.slug;
  const title = (item.title ?? "article").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70).replace(/-$/, "") || "article";
  // Hex encoding is injective, unlike a short hash. Existing IDs are small.
  const suffix = Array.from(new TextEncoder().encode(item.id), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${title}--${suffix}`;
}

export function articlePath(item: Pick<FeedItem, "id" | "title" | "slug">, base = "/"): string {
  return `${base.replace(/\/$/, "")}/p/${articleSlug(item)}/`;
}

export function withArticleSlug(item: FeedItem): FeedItem {
  return item.editorial ? { ...item, slug: articleSlug(item) } : item;
}
