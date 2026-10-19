import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BatchFileSchema, ManifestSchema, type BatchRef, type FeedItem, type Manifest } from "../schemas";
import { TOPICS, topicLabel, topicPath, topicSlug } from "../shared/topics";
import { articlePath, articleRouteSlug, articleSlug } from "../shared/articles";
import { publicationDate } from "../shared/publicationDate";
import { absoluteUrl, articleMetadata, collectionMetadata, escapeHtml as escape, inlineJson, renderMetadata, SITE_ORIGIN, type PageMetadata } from "../shared/seo";
import { writeArticlePreview } from "./articlePreview";
import { writeDiscovery } from "./discovery";

export const INDEX_PAGE_SIZE = 50;
export const ARTICLE_ARCHIVE_PAGE_SIZE = 50;

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

function readingMarkup(item: FeedItem): string {
  const editorial = item.editorial!;
  const body = `<p class="post-card-body">${escape(item.body)}</p>`;
  const discussion = (editorial.discussion ?? []).map(turn => `<div class="editorial-discussion-turn"><strong>${escape(turn.voice)}</strong><p>${escape(turn.body)}</p></div>`).join("");
  const reading = body + (discussion ? `<section class="editorial-discussion" aria-label="AI-generated discussion"><h2>AI-generated discussion</h2>${discussion}</section>` : "");
  return editorial.spoilers ? `<div data-nosnippet><details><summary>Show spoilers</summary>${reading}</details></div>` : reading;
}

export function articleMarkup(item: FeedItem, base: string): string {
  const editorial = item.editorial!;
  const sources = editorial.sources.map(source => `<li><a href="${escape(source.url)}" rel="noreferrer">${escape(source.publisher)} — ${escape(source.title)}</a><p>${dateMarkup(source.publishedAt)}</p></li>`).join("");
  return `<div class="app"><header class="app-header"><a class="app-title" href="${base}">CoBanter</a></header><main class="app-main"><article class="post-card"><p>${escape(editorial.format)} · AI-edited · ${dateMarkup(item.createdAt, true)}</p><a class="post-card-community" href="${escape(topicPath(item.community, base))}">${escape(topicLabel(item.community))}</a><h1>${escape(item.title ?? "Article")}</h1>${readingMarkup(item)}<section class="source-panel"><h2>Based on publisher excerpts</h2><ul>${sources}</ul></section></article><a href="${base}">← Back to feed</a> · <a href="${base}archive/">Article archive</a></main></div>`;
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
  const site = { base, origin: parsedOrigin.origin };
  const buildPage = (page: PageMetadata, markup: string, extra = "", standalone = false) => {
    const template = standalone ? shell.replace(/<script\b[^>]*\btype="module"[^>]*>[\s\S]*?<\/script>/g, "") : shell;
    return template.replace(/<title>[\s\S]*?<\/title>/, renderMetadata(page)
      + `<link rel="sitemap" type="application/xml" href="${escape(absoluteUrl(`${base}sitemap.xml`, site))}"><link rel="describedby" type="text/plain" href="${escape(absoluteUrl(`${base}llms.txt`, site))}">`)
      .replace('<div id="root"></div>', `<div id="root">${markup}</div>${extra}`);
  };
  const urls = [absoluteUrl(base, site)];
  const articles: FeedItem[] = [];
  const seen = new Set<string>();
  let count = 0;
  const topicBatches = new Map<string, BatchRef[]>(TOPICS.map(topic => [topic, []]));
  const topicArticles = new Map<string, FeedItem[]>(TOPICS.map(topic => [topic, []]));
  for (const ref of manifest.batches) {
    const batch = BatchFileSchema.parse(JSON.parse(readFileSync(path.join(data, ref.file), "utf8")));
    for (const topic of TOPICS) {
      const matching = batch.items.filter(item => item.community === topic);
      if (!matching.length) continue;
      topicBatches.get(topic)!.push({ ...ref, itemCount: matching.length });
      const recent = topicArticles.get(topic)!;
      recent.push(...matching.filter(item => item.editorial).slice(0, 20 - recent.length));
    }
    for (const item of batch.items) {
      if (!item.editorial) continue;
      articles.push(item);
      const slug = articleSlug(item);
      const routes = new Set([articleRouteSlug(item), slug]);
      for (const route of routes) {
        if (seen.has(route)) throw new Error(`Duplicate article slug: ${route}`);
        seen.add(route);
      }
      urls.push(absoluteUrl(articlePath(item, base), site));
      const preview = writeArticlePreview(item, dist, base, origin);
      const html = buildPage(articleMetadata(item, site, preview), articleMarkup(item, base), `<script id="article-data" type="application/json">${inlineJson({ ...item, slug })}</script>`);
      // Retain old addresses as complete pages with the short canonical/sharing URL.
      for (const route of routes) {
        const directory = path.join(dist, "p", route);
        mkdirSync(directory, { recursive: true });
        writeFileSync(path.join(directory, "index.html"), html);
        // Small direct payload supports client-side navigation without loading old batches.
        writeFileSync(path.join(directory, "article.json"), JSON.stringify({ ...item, slug }));
      }
      count++;
    }
  }
  // Topic indexes refer to the original immutable batches, without duplicating content.
  for (const topic of TOPICS) {
    const slug = topicSlug(topic);
    const directory = path.join(dist, "topics", slug);
    mkdirSync(directory, { recursive: true });
    const url = new URL(topicPath(topic, base), origin).href;
    urls.push(url);
    const title = escape(topicLabel(topic));
    const description = escape(`News, stories, and ideas about ${topicLabel(topic)} on CoBanter.`);
    const links = topicArticles.get(topic)!.map(item => `<li><a href="${articlePath(item, base)}">${escape(item.title ?? "Article")}</a></li>`).join("");
    const markup = `<div class="app"><header class="app-header"><a class="app-title" href="${base}">CoBanter</a></header><main class="app-main"><h1>${title}</h1><p>${description}</p>${links ? `<ul>${links}</ul>` : "<p>No posts here yet.</p>"}<a href="${base}">All topics</a> · <a href="${base}archive/">Complete article archive</a></main></div>`;
    writeFileSync(path.join(directory, "index.html"), buildPage(collectionMetadata(site, topic, topicArticles.get(topic)), markup));
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
  articles.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  const recent = articles.slice(0, 20);
  const topics = TOPICS.map(topic => `<a href="${topicPath(topic, base)}">${escape(topicLabel(topic))}</a>`).join(" · ");
  const posts = recent.map(item => `<article class="post-card"><a href="${topicPath(item.community, base)}">${escape(topicLabel(item.community))}</a><h2><a href="${articlePath(item, base)}">${escape(item.title ?? "Article")}</a></h2><p>AI-written · ${dateMarkup(item.createdAt, true)}</p>${readingMarkup(item)}<a href="${articlePath(item, base)}">Full article and original sources</a></article>`).join("");
  const homepage = `<div class="app"><header class="app-header"><a class="app-title" href="${base}">CoBanter</a></header><div class="transparency-banner">Real sources. AI-written summaries and commentary. Open the originals for full context.</div><main class="app-main"><h1>Leave with something worth knowing.</h1><p>Fresh context, useful ideas, true stories, and a little back-and-forth.</p><nav aria-label="Topics">${topics}</nav>${posts}<a href="${base}archive/">Complete article archive</a></main></div>`;
  writeFileSync(path.join(dist, "index.html"), buildPage(collectionMetadata(site, "", recent), homepage));
  const archivePath = (page: number) => `${base}archive/${page === 1 ? "" : `page-${page}/`}`;
  const pageCount = Math.max(1, Math.ceil(articles.length / ARTICLE_ARCHIVE_PAGE_SIZE));
  for (let page = 1; page <= pageCount; page++) {
    const pageArticles = articles.slice((page - 1) * ARTICLE_ARCHIVE_PAGE_SIZE, page * ARTICLE_ARCHIVE_PAGE_SIZE);
    const url = absoluteUrl(archivePath(page), site);
    urls.push(url);
    const title = `Article archive${page === 1 ? "" : ` — Page ${page}`} · CoBanter`;
    const description = "Browse every permanent CoBanter article, with original source links and AI-written commentary.";
    const links = pageArticles.map(item => `<li><a href="${articlePath(item, base)}">${escape(item.title ?? "Article")}</a> · ${escape(topicLabel(item.community))} · ${dateMarkup(item.createdAt, true)}</li>`).join("");
    const navigation = `<nav aria-label="Archive pages">${page > 1 ? `<a rel="prev" href="${archivePath(page - 1)}">← Newer articles</a> · ` : ""}Page ${page} of ${pageCount}${page < pageCount ? ` · <a rel="next" href="${archivePath(page + 1)}">Older articles →</a>` : ""}</nav>`;
    const markup = `<div class="app"><header class="app-header"><a class="app-title" href="${base}">CoBanter</a></header><main class="app-main"><h1>${escape(title)}</h1><p>${description}</p>${navigation}<ul>${links}</ul>${navigation}<a href="${base}">Latest reading</a></main></div>`;
    const directory = path.join(dist, archivePath(page).slice(base.length));
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, "index.html"), buildPage({ ...collectionMetadata(site), title, description, url, structuredData: { "@context": "https://schema.org", "@type": "CollectionPage", name: title, description, url } }, markup, "", true));
  }
  writeDiscovery(dist, site, urls, recent);
  writeFileSync(path.join(dist, "404.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex, follow"><title>Page not found · CoBanter</title><body><h1>Page not found</h1><p>This address doesn't match a published article or topic.</p><a href="${base}">Return to CoBanter</a></body></html>`);
  const bytes = (directory: string): number => readdirSync(directory).reduce((sum, name) => {
    const file = path.join(directory, name), info = statSync(file);
    return sum + (info.isDirectory() ? bytes(file) : info.size);
  }, 0);
  const total = bytes(dist);
  console.log(`[archive] ${count} permanent articles; ${TOPICS.length} topic pages; ${(total / 1024 / 1024).toFixed(2)} MiB deployed output; ${INDEX_PAGE_SIZE} batch refs per index page.`);
  if (total > 750 * 1024 * 1024) console.warn("[archive] Capacity review needed: output exceeds 750 MiB. Preserve all content; plan additional capacity.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) buildArchive();
