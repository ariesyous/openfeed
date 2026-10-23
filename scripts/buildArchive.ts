import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BatchFileSchema, ManifestSchema, type BatchRef, type FeedItem, type Manifest } from "../schemas";
import { TOPICS, topicLabel, topicPath, topicSlug } from "../shared/topics";
import { articlePath, articleRouteSlug, articleSlug } from "../shared/articles";
import { publicationDate } from "../shared/publicationDate";
import { splitParagraphs } from "../shared/reading";
import { relatedReading, type RelatedReading } from "../shared/related";
import { searchRow, type SearchIndex } from "../shared/search";
import { absoluteUrl, articleMetadata, collectionMetadata, escapeHtml as escape, inlineJson, renderMetadata, SITE_DESCRIPTION, SITE_ORIGIN, topicDescription, type PageMetadata, type ShareImages, type SiteLocation } from "../shared/seo";
import { writeArticlePreview, writeCollectionPreview } from "./articlePreview";
import { brandHead, writeBrandAssets } from "./brandAssets";
import { writeDiscovery } from "./discovery";
import { feedLinks, feedPath, writeFeeds } from "./feeds";
import { ABOUT_DESCRIPTION, ABOUT_TITLE, aboutMarkup } from "./aboutPage";

export const INDEX_PAGE_SIZE = 50;
export const ARTICLE_ARCHIVE_PAGE_SIZE = 50;
const FORMAT_LABELS = { news: "News", explainer: "Explained", story: "True story", banter: "Banter · Opinion" } as const;

/** Fill pages from oldest to newest so adding an edition does not shift archive pages. */
export function paginateManifest(manifest: Manifest, size = INDEX_PAGE_SIZE): Map<string, Manifest> {
  if (!Number.isInteger(size) || size < 1) throw new Error("Invalid index page size");
  const pages = new Map<string, Manifest>();
  const remaining = [...manifest.batches];
  let previous: string | undefined;
  let page = 0;
  while (remaining.length > size) {
    const batches = remaining.splice(-size);
    const file = `archive/page-${page++}.json`;
    pages.set(file, { ...manifest, batches, olderManifest: previous });
    previous = file;
  }
  pages.set("manifest.json", { ...manifest, batches: remaining, olderManifest: previous });
  return pages;
}

function dateMarkup(iso: string | undefined, added = false): string {
  const date = publicationDate(iso);
  if (date.status !== "dated") return added ? "Added date unavailable" : "Publication date unavailable";
  return `<time datetime="${escape(date.dateTime)}">${added ? "Added" : "Published"} ${escape(date.label)}</time>`;
}

const paragraphs = (text: string) => `<div class="post-card-body">${splitParagraphs(text).map(paragraph => `<p>${escape(paragraph)}</p>`).join("")}</div>`;

function readingMarkup(item: FeedItem): string {
  const editorial = item.editorial!;
  const discussion = (editorial.discussion ?? []).map(turn => `<div class="editorial-discussion-turn"><strong>${escape(turn.voice)}</strong><p>${escape(turn.body)}</p></div>`).join("");
  const reading = paragraphs(item.body) + (discussion ? `<section class="editorial-discussion" aria-label="AI-generated discussion"><h2 class="source-panel-label">AI-generated discussion · Different perspectives</h2>${discussion}</section>` : "");
  return editorial.spoilers ? `<div data-nosnippet><details class="spoiler-gate"><summary>Show spoilers</summary>${reading}</details></div>` : reading;
}

/** Shared chrome for build-time pages; class names match the React app's styles. */
export function staticHeader(base: string): string {
  return `<a class="skip-link" href="#main">Skip to content</a><header class="app-header"><a class="app-title" href="${base}"><img class="app-mark" src="${base}favicon.svg" alt="" width="24" height="24"><span class="app-name">CoBanter</span><span class="app-tagline"> A little more worth reading.</span></a></header>`;
}
export function staticFooter(base: string, topic = ""): string {
  return `<footer class="site-links"><a href="${base}about/">How CoBanter works</a><a href="${base}archive/">Article archive</a><a href="${escape(feedPath(topic, base))}">RSS${topic ? ` · ${escape(topicLabel(topic))}` : ""}</a></footer>`;
}
const banner = (base: string) => `<div class="transparency-banner" role="note">Real sources. AI-written summaries and commentary. Open the originals for full context. <a href="${base}about/">How this works</a></div>`;
const staticPage = (base: string, main: string, options: { mainClass?: string; banner?: boolean; topic?: string } = {}) =>
  `<div class="app">${staticHeader(base)}${options.banner ? banner(base) : ""}<main id="main" class="app-main${options.mainClass ? ` ${options.mainClass}` : ""}">${main}</main>${staticFooter(base, options.topic)}</div>`;

function relatedLink(entry: RelatedReading["more"][number]): string {
  return `<a href="${escape(entry.path)}"><span class="related-title">${escape(entry.title)}</span><span class="related-meta">${escape(FORMAT_LABELS[entry.format])} · ${dateMarkup(entry.createdAt, true)}</span></a>`;
}
export function relatedMarkup(related: RelatedReading, base: string): string {
  if (!related.more.length && !related.newer && !related.older) return "";
  const label = escape(topicLabel(related.topic));
  const more = related.more.length ? `<h2>More in <a href="${escape(topicPath(related.topic, base))}">${label}</a></h2><ul>${related.more.map(entry => `<li>${relatedLink(entry)}</li>`).join("")}</ul>` : "";
  const sequence = related.newer || related.older ? `<div class="related-sequence">${related.newer ? `<div><span>Newer in ${label}</span>${relatedLink(related.newer)}</div>` : ""}${related.older ? `<div><span>Older in ${label}</span>${relatedLink(related.older)}</div>` : ""}</div>` : "";
  return `<nav class="related-reading" aria-label="Related reading">${more}${sequence}</nav>`;
}

export function articleMarkup(item: FeedItem, base: string, related?: RelatedReading): string {
  const editorial = item.editorial!;
  const sources = editorial.sources.map(source => `<a class="source-link" href="${escape(source.url)}" rel="noreferrer"><span>${escape(source.publisher)} ↗</span><span>${escape(source.title)}</span>${dateMarkup(source.publishedAt)}</a>`).join("");
  const article = `<article class="post-card article-page"><div class="post-card-meta"><span class="format-label format-label--${escape(editorial.format)}">${escape(FORMAT_LABELS[editorial.format])}</span><a class="post-card-community" href="${escape(topicPath(item.community, base))}">${escape(topicLabel(item.community))}</a></div>`
    + `<h1 class="post-card-title">${escape(item.title ?? "Article")}</h1><p class="article-byline">CoBanter · AI-edited · ${dateMarkup(item.createdAt, true)}</p>${readingMarkup(item)}`
    + `<section class="source-panel"><h2 class="source-panel-label">${editorial.format === "banter" ? "Generated commentary · Source context" : "Based on publisher excerpts"}</h2>${sources}</section></article>`;
  return staticPage(base, `<section class="article-shell"><a class="back-link" href="${base}">← Back to feed</a>${article}${related ? relatedMarkup(related, base) : ""}</section>`, { mainClass: "app-main--article", topic: item.community });
}

/** A permanent old address: the article's own sharing metadata and canonical link
 * (social crawlers don't follow redirects), an instant same-origin script redirect
 * that keeps the query and fragment, and a meta refresh plus link without JavaScript. */
export function redirectPage(metadata: PageMetadata, path: string): string {
  const url = escape(metadata.url!);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">${renderMetadata({ ...metadata, structuredData: undefined })}<meta http-equiv="refresh" content="0; url=${url}"><script>location.replace(${inlineJson(path)} + location.search + location.hash)</script></head><body><p>This article has moved to <a href="${url}">${url}</a>.</p></body></html>`;
}

function postSummary(item: FeedItem, base: string): string {
  const editorial = item.editorial!;
  return `<article class="post-card"><div class="post-card-meta"><span class="format-label format-label--${escape(editorial.format)}">${escape(FORMAT_LABELS[editorial.format])}</span><a class="post-card-community" href="${topicPath(item.community, base)}">${escape(topicLabel(item.community))}</a></div><h2 class="post-card-title"><a href="${articlePath(item, base)}">${escape(item.title ?? "Article")}</a></h2><p class="article-byline">AI-written · ${dateMarkup(item.createdAt, true)}</p>${readingMarkup(item)}<p><a href="${articlePath(item, base)}">Full article and original sources</a></p></article>`;
}

function topicNavigation(base: string, current = ""): string {
  const links = ["", ...[...TOPICS].sort()].map(topic => `<a href="${escape(topicPath(topic, base))}"${topic === current ? ' aria-current="page"' : ""}>${escape(topic ? topicLabel(topic) : "All topics")}</a>`).join("");
  return `<nav class="topic-navigation" aria-label="Topics"><h2>Topics</h2><div class="topic-buttons">${links}</div></nav>`;
}

function archiveLink(item: FeedItem, base: string): string {
  return `<li><a href="${articlePath(item, base)}">${escape(item.title ?? "Article")}</a><span class="related-meta">${escape(topicLabel(item.community))} · ${dateMarkup(item.createdAt, true)}</span></li>`;
}

export function buildArchive(root = process.cwd()) {
  const data = path.join(root, "public/data");
  const dist = path.join(root, "dist");
  const manifest = ManifestSchema.parse(JSON.parse(readFileSync(path.join(data, "manifest.json"), "utf8")));
  const shell = readFileSync(path.join(dist, "index.html"), "utf8");
  const base = process.env.SITE_BASE_PATH ?? "/";
  const origin = process.env.SITE_ORIGIN ?? SITE_ORIGIN;
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error("Invalid site base path");
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.protocol !== "https:" || parsedOrigin.username || parsedOrigin.password || parsedOrigin.pathname !== "/" || parsedOrigin.search || parsedOrigin.hash) throw new Error("SITE_ORIGIN must be an HTTPS origin");
  const site: SiteLocation = { base, origin: parsedOrigin.origin };
  const buildPage = (page: PageMetadata, markup: string, extra = "", standalone = false, topic = "") => {
    const template = standalone ? shell.replace(/<script\b[^>]*\btype="module"[^>]*>[\s\S]*?<\/script>/g, "") : shell;
    return template.replace(/<title>[\s\S]*?<\/title>/, renderMetadata(page)
      + `<link rel="sitemap" type="application/xml" href="${escape(absoluteUrl(`${base}sitemap.xml`, site))}"><link rel="describedby" type="text/plain" href="${escape(absoluteUrl(`${base}llms.txt`, site))}">`
      + feedLinks(site, topic) + brandHead(base))
      .replace('<div id="root"></div>', `<div id="root">${markup}</div>${extra}`);
  };
  writeBrandAssets(dist, base);
  const urls = [absoluteUrl(base, site), absoluteUrl(`${base}about/`, site)];
  const articles: FeedItem[] = [];
  const seen = new Set<string>();
  const topicBatches = new Map<string, BatchRef[]>(TOPICS.map(topic => [topic, []]));
  for (const ref of manifest.batches) {
    const batch = BatchFileSchema.parse(JSON.parse(readFileSync(path.join(data, ref.file), "utf8")));
    for (const topic of TOPICS) {
      const matching = batch.items.filter(item => item.community === topic);
      if (matching.length) topicBatches.get(topic)!.push({ ...ref, itemCount: matching.length });
    }
    for (const item of batch.items) {
      if (!item.editorial) continue;
      for (const route of new Set([articleRouteSlug(item), articleSlug(item)])) {
        if (seen.has(route)) throw new Error(`Duplicate article slug: ${route}`);
        seen.add(route);
      }
      articles.push(item);
    }
  }
  articles.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  const topicArticles = new Map<string, FeedItem[]>(TOPICS.map(topic => [topic, articles.filter(item => item.community === topic)]));
  // Keyed by topic ("" is home) so in-app navigation can keep each page's hashed share image.
  const shareImages: ShareImages = {};
  for (const item of articles) {
    const slug = articleSlug(item);
    urls.push(absoluteUrl(articlePath(item, base), site));
    const related = relatedReading(item, topicArticles.get(item.community) ?? [], base);
    const preview = writeArticlePreview(item, dist, base, origin);
    const metadata = articleMetadata(item, site, preview);
    const html = buildPage(metadata, articleMarkup(item, base, related), `<script id="article-data" type="application/json">${inlineJson({ ...item, slug })}</script>`, false, item.community);
    const canonicalRoute = articleRouteSlug(item);
    // Old stored-slug addresses keep resolving through a small redirect page rather
    // than a second full copy, which roughly halved each article's HTML footprint.
    for (const route of new Set([canonicalRoute, slug])) {
      const directory = path.join(dist, "p", route);
      mkdirSync(directory, { recursive: true });
      writeFileSync(path.join(directory, "index.html"), route === canonicalRoute ? html : redirectPage(metadata, articlePath(item, base)));
      // Small direct payload supports client-side navigation without loading old batches.
      writeFileSync(path.join(directory, "article.json"), JSON.stringify({ ...item, slug }));
      writeFileSync(path.join(directory, "related.json"), JSON.stringify(related));
    }
  }
  // Topic indexes refer to the original immutable batches, without duplicating content.
  for (const topic of TOPICS) {
    const slug = topicSlug(topic);
    const directory = path.join(dist, "topics", slug);
    mkdirSync(directory, { recursive: true });
    urls.push(absoluteUrl(topicPath(topic, base), site));
    const recent = topicArticles.get(topic)!.slice(0, 20);
    const links = recent.map(item => archiveLink(item, base)).join("");
    const image = writeCollectionPreview(`topic-${slug}`, { eyebrow: "Topic", title: topicLabel(topic), subtitle: topicDescription(topic) }, dist, base, origin);
    shareImages[topic] = image;
    const markup = staticPage(base, `<div class="feed-layout">${topicNavigation(base, topic)}<div class="feed-content"><div class="feed-toolbar"><h1>${escape(topicLabel(topic))}</h1><p>${escape(topicDescription(topic))}</p></div>${links ? `<ul class="archive-list">${links}</ul>` : "<p>No posts here yet.</p>"}<p class="static-nav"><a href="${base}">All topics</a> · <a href="${base}archive/">Complete article archive</a></p></div></div>`, { mainClass: "app-main--feed", banner: true, topic });
    writeFileSync(path.join(directory, "index.html"), buildPage(collectionMetadata(site, topic, recent, image), markup, "", false, topic));
    const indexPath = (file: string) => file === "manifest.json" ? `topics/${slug}/manifest.json` : file.replace("archive/page-", `archive/page-${slug}-`);
    for (const [file, page] of paginateManifest({ ...manifest, batches: topicBatches.get(topic)! })) {
      const target = path.join(dist, "data", indexPath(file));
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, JSON.stringify({ ...page, olderManifest: page.olderManifest ? indexPath(page.olderManifest) : undefined }));
    }
  }
  for (const [file, page] of paginateManifest(manifest)) {
    const target = path.join(dist, "data", file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(page));
  }
  const recent = articles.slice(0, 20);
  const homeImage = writeCollectionPreview("home", { eyebrow: "CoBanter", title: "Leave with something worth knowing.", subtitle: SITE_DESCRIPTION }, dist, base, origin);
  shareImages[""] = homeImage;
  writeFileSync(path.join(dist, "data", "share-images.json"), JSON.stringify(shareImages));
  const homepage = staticPage(base, `<div class="feed-layout">${topicNavigation(base)}<div class="feed-content"><div class="feed-toolbar"><h1>Leave with something worth knowing.</h1><p>Fresh context, useful ideas, true stories, and a little back-and-forth.</p></div><div class="feed-list">${recent.map(item => postSummary(item, base)).join("")}</div><p class="static-nav"><a href="${base}archive/">Complete article archive</a></p></div></div>`, { mainClass: "app-main--feed", banner: true });
  writeFileSync(path.join(dist, "index.html"), buildPage(collectionMetadata(site, "", recent, homeImage), homepage));
  const archivePath = (page: number) => `${base}archive/${page === 1 ? "" : `page-${page}/`}`;
  const pageCount = Math.max(1, Math.ceil(articles.length / ARTICLE_ARCHIVE_PAGE_SIZE));
  for (let page = 1; page <= pageCount; page++) {
    const pageArticles = articles.slice((page - 1) * ARTICLE_ARCHIVE_PAGE_SIZE, page * ARTICLE_ARCHIVE_PAGE_SIZE);
    const url = absoluteUrl(archivePath(page), site);
    urls.push(url);
    const title = `Article archive${page === 1 ? "" : ` — Page ${page}`} · CoBanter`;
    const description = "Browse every permanent CoBanter article, with original source links and AI-written commentary.";
    const links = pageArticles.map(item => archiveLink(item, base)).join("");
    const navigation = `<nav class="static-nav" aria-label="Archive pages">${page > 1 ? `<a rel="prev" href="${archivePath(page - 1)}">← Newer articles</a> · ` : ""}Page ${page} of ${pageCount}${page < pageCount ? ` · <a rel="next" href="${archivePath(page + 1)}">Older articles →</a>` : ""}</nav>`;
    const markup = staticPage(base, `<h1>Article archive${page === 1 ? "" : ` — Page ${page}`}</h1><p class="lede">${description}</p>${navigation}<ul class="archive-list">${links}</ul>${navigation}<p class="static-nav"><a href="${base}">Latest reading</a></p>`, { mainClass: "static-page" });
    const directory = path.join(dist, archivePath(page).slice(base.length));
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, "index.html"), buildPage({ ...collectionMetadata(site, "", [], homeImage), title, description, url, structuredData: { "@context": "https://schema.org", "@type": "CollectionPage", name: title, description, url } }, markup, "", true));
  }
  const aboutUrl = absoluteUrl(`${base}about/`, site);
  mkdirSync(path.join(dist, "about"), { recursive: true });
  writeFileSync(path.join(dist, "about", "index.html"), buildPage({ ...collectionMetadata(site, "", [], homeImage), title: `${ABOUT_TITLE} · CoBanter`, description: ABOUT_DESCRIPTION, url: aboutUrl,
    structuredData: { "@context": "https://schema.org", "@type": "AboutPage", name: ABOUT_TITLE, description: ABOUT_DESCRIPTION, url: aboutUrl, about: { "@type": "Organization", name: "CoBanter", url: absoluteUrl(base, site) } } },
  staticPage(base, aboutMarkup(base), { mainClass: "static-page" }), "", true));
  // The search route is rendered by the app; its shell is never indexed.
  mkdirSync(path.join(dist, "search"), { recursive: true });
  writeFileSync(path.join(dist, "search", "index.html"), buildPage({ title: "Search · CoBanter", description: "Search every CoBanter article by headline, topic or publisher.", noindex: true },
    staticPage(base, `<h1>Search</h1><p class="lede">Search needs JavaScript. Browse the <a href="${base}archive/">complete article archive</a> instead.</p>`, { mainClass: "static-page" })));
  const searchIndex: SearchIndex = { version: 1, articles: articles.map(item => searchRow(item, base)) };
  writeFileSync(path.join(dist, "data", "search-index.json"), JSON.stringify(searchIndex));
  writeFeeds(dist, site, articles);
  writeDiscovery(dist, site, urls, recent);
  const notFound = staticPage(base, `<h1>Page not found</h1><p class="lede">This address doesn't match a published article or topic.</p><p class="static-nav"><a href="${base}">Return to CoBanter</a> · <a href="${base}archive/">Browse the archive</a> · <a href="${base}search/">Search</a></p>`, { mainClass: "static-page" });
  writeFileSync(path.join(dist, "404.html"), buildPage({ title: "Page not found · CoBanter", description: "This address doesn't match a published article or topic.", noindex: true }, notFound, "", true));
  const bytes = (directory: string): number => readdirSync(directory).reduce((sum, name) => {
    const file = path.join(directory, name), info = statSync(file);
    return sum + (info.isDirectory() ? bytes(file) : info.size);
  }, 0);
  const total = bytes(dist);
  const perArticle = articles.length ? ` (${(total / articles.length / 1024).toFixed(1)} KiB per article)` : "";
  console.log(`[archive] ${articles.length} permanent articles; ${TOPICS.length} topic pages; ${(total / 1024 / 1024).toFixed(2)} MiB deployed output${perArticle}; ${INDEX_PAGE_SIZE} batch refs per index page.`);
  // GitHub Pages publishes at most 1 GB per site.
  if (total > 750 * 1024 * 1024) console.warn("[archive] Capacity review needed: output exceeds 750 MiB of GitHub Pages' 1 GB site limit. Preserve all content; plan additional capacity.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) buildArchive();
