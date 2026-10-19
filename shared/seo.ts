import type { FeedItem } from "../schemas";
import { articlePath } from "./articles";
import { publicationDate } from "./publicationDate";
import { topicLabel, topicPath } from "./topics";

export const SITE_ORIGIN = "https://cobanter.com";
export const SITE_TITLE = "CoBanter — News, ideas & AI discussion";
export const SITE_DESCRIPTION = "Source-linked news, explainers, and stories on AI, science, economics, philosophy, movies, and more, with clearly labelled AI-written commentary and discussion.";
export const SPOILER_DESCRIPTION = "A spoiler-protected CoBanter article. Open to read.";
export type SiteLocation = { base: string; origin: string };
export type PageMetadata = {
  title: string;
  description: string;
  url?: string;
  type?: "website" | "article";
  publishedAt?: string;
  image?: { url: string; alt: string };
  noindex?: boolean;
  structuredData?: Record<string, unknown>;
};

export const absoluteUrl = (pathname: string, site: SiteLocation) => new URL(pathname, site.origin).href;
export const articleDescription = (item: FeedItem) => item.editorial?.spoilers
  ? SPOILER_DESCRIPTION : item.body.replace(/\s+/g, " ").trim().slice(0, 180);

export function collectionMetadata(site: SiteLocation, topic = "", items: FeedItem[] = []): PageMetadata {
  const url = absoluteUrl(topicPath(topic, site.base), site);
  const home = absoluteUrl(site.base, site);
  const title = topic ? `${topicLabel(topic)} · CoBanter` : SITE_TITLE;
  const description = topic ? `News, stories, and ideas about ${topicLabel(topic)} on CoBanter.` : SITE_DESCRIPTION;
  return {
    title, description, url, type: "website",
    structuredData: {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Organization", "@id": `${home}#publisher`, name: "CoBanter", url: home },
        { "@type": "WebSite", "@id": `${home}#website`, name: "CoBanter", url: home, inLanguage: "en", publisher: { "@id": `${home}#publisher` } },
        { "@type": "CollectionPage", "@id": url, url, name: title, description, isPartOf: { "@id": `${home}#website` },
          ...(items.length ? { mainEntity: { "@type": "ItemList", itemListElement: items.map((item, index) => ({
            "@type": "ListItem", position: index + 1, name: item.title ?? "Article", url: absoluteUrl(articlePath(item, site.base), site),
          })) } } : {}),
        },
      ],
    },
  };
}

export function articleMetadata(item: FeedItem, site: SiteLocation, image?: PageMetadata["image"]): PageMetadata {
  const url = absoluteUrl(articlePath(item, site.base), site);
  const home = absoluteUrl(site.base, site);
  const description = articleDescription(item);
  const date = publicationDate(item.createdAt);
  const publishedAt = date.status === "dated" ? date.dateTime : undefined;
  return {
    title: `${item.title ?? "Article"} · CoBanter`, description, url, type: "article", image, publishedAt,
    structuredData: {
      "@context": "https://schema.org", "@type": "Article", "@id": `${url}#article`,
      url, mainEntityOfPage: url, headline: item.title ?? "Article", description, inLanguage: "en",
      ...(publishedAt ? { datePublished: publishedAt } : {}),
      ...(image ? { image: [image.url] } : {}),
      author: { "@type": "Organization", name: "CoBanter", url: home },
      publisher: { "@type": "Organization", name: "CoBanter", url: home },
      articleSection: topicLabel(item.community),
      citation: item.editorial!.sources.map(source => source.url),
      // Do not put spoiler bodies or synthetic discussion participants in search data.
    },
  };
}

export function metadataTags(page: PageMetadata): { name?: string; property?: string; content: string }[] {
  return [
    { name: "description", content: page.description },
    { name: "robots", content: page.noindex ? "noindex, follow" : "index, follow, max-image-preview:large" },
    { property: "og:site_name", content: "CoBanter" },
    { property: "og:locale", content: "en_US" },
    { property: "og:type", content: page.type ?? "website" },
    { property: "og:title", content: page.title },
    { property: "og:description", content: page.description },
    ...(page.url ? [{ property: "og:url", content: page.url }] : []),
    { name: "twitter:card", content: page.image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: page.title },
    { name: "twitter:description", content: page.description },
    ...(page.publishedAt ? [{ property: "article:published_time", content: page.publishedAt }] : []),
    ...(page.image ? [
      { property: "og:image", content: page.image.url },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: page.image.alt },
      { name: "twitter:image", content: page.image.url },
      { name: "twitter:image:alt", content: page.image.alt },
    ] : []),
  ];
}

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const inlineJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

export function renderMetadata(page: PageMetadata): string {
  return `<title>${escapeHtml(page.title)}</title>`
    + (page.url ? `<link rel="canonical" href="${escapeHtml(page.url)}">` : "")
    + metadataTags(page).map(tag => `<meta ${tag.name ? `name="${tag.name}"` : `property="${tag.property}"`} content="${escapeHtml(tag.content)}" data-seo>`).join("")
    + (page.structuredData ? `<script id="page-structured-data" type="application/ld+json">${inlineJson(page.structuredData)}</script>` : "");
}
