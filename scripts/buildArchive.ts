import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BatchFileSchema, ManifestSchema, type BatchRef, type FeedItem, type Manifest } from "../schemas";
import { TOPICS, topicLabel, topicPath, topicSlug } from "../shared/topics";
import { articlePath, articleRouteSlug, articleSlug } from "../shared/articles";
import { publicationDate } from "../shared/publicationDate";
import { PREVIEW_HEIGHT, PREVIEW_WIDTH, writeArticlePreview } from "./articlePreview";

export const INDEX_PAGE_SIZE = 50;
const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]!);

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

export function articleMarkup(item: FeedItem, base: string): string {
  const editorial = item.editorial!;
  const body = `<p class="post-card-body">${escape(item.body)}</p>`;
  const discussion = (editorial.discussion ?? []).map(turn => `<div class="editorial-discussion-turn"><strong>${escape(turn.voice)}</strong><p>${escape(turn.body)}</p></div>`).join("");
  const reading = body + (discussion ? `<section class="editorial-discussion" aria-label="AI-generated discussion"><h2>AI-generated discussion</h2>${discussion}</section>` : "");
  const sources = editorial.sources.map(source => `<li><a href="${escape(source.url)}" rel="noreferrer">${escape(source.publisher)} — ${escape(source.title)}</a><p>${dateMarkup(source.publishedAt)}</p></li>`).join("");
  return `<div class="app"><header class="app-header"><a class="app-title" href="${base}">CoBanter</a></header><main class="app-main"><article class="post-card"><p>${escape(editorial.format)} · AI-edited · ${dateMarkup(item.createdAt, true)}</p><a class="post-card-community" href="${escape(topicPath(item.community, base))}">${escape(topicLabel(item.community))}</a><h1>${escape(item.title ?? "Article")}</h1>${editorial.spoilers ? `<details><summary>Show spoilers</summary>${reading}</details>` : reading}<section class="source-panel"><h2>Based on publisher excerpts</h2><ul>${sources}</ul></section></article><a href="${base}">← Back to feed</a></main></div>`;
}

export function buildArchive(root = process.cwd()) {
  const data = path.join(root, "public/data");
  const dist = path.join(root, "dist");
  const manifest = ManifestSchema.parse(JSON.parse(readFileSync(path.join(data, "manifest.json"), "utf8")));
  const shell = readFileSync(path.join(dist, "index.html"), "utf8");
  const base = process.env.SITE_BASE_PATH ?? "/";
  const origin = process.env.SITE_ORIGIN ?? "https://cobanter.com";
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error("Invalid site base path");
  if (new URL(origin).protocol !== "https:") throw new Error("SITE_ORIGIN must use HTTPS");
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
      const slug = articleSlug(item);
      const routes = new Set([articleRouteSlug(item), slug]);
      for (const route of routes) {
        if (seen.has(route)) throw new Error(`Duplicate article slug: ${route}`);
        seen.add(route);
      }
      const url = new URL(articlePath(item, base), origin).href;
      const title = escape(item.title ?? "CoBanter article");
      const description = escape(item.editorial.spoilers ? "A spoiler-protected CoBanter article. Open to read." : item.body.replace(/\s+/g, " ").slice(0, 180));
      const preview = writeArticlePreview(item, dist, base, origin);
      const imageMetadata = `<meta property="og:image" content="${escape(preview.url)}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="${PREVIEW_WIDTH}"><meta property="og:image:height" content="${PREVIEW_HEIGHT}"><meta property="og:image:alt" content="${escape(preview.alt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${escape(preview.url)}"><meta name="twitter:image:alt" content="${escape(preview.alt)}">`;
      const metadata = `<title>${title} · CoBanter</title><link rel="canonical" href="${escape(url)}"><meta name="description" content="${description}"><meta property="og:site_name" content="CoBanter"><meta property="og:type" content="article"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${escape(url)}">${imageMetadata}`;
      const json = JSON.stringify({ ...item, slug }).replace(/</g, "\\u003c");
      const html = shell.replace(/<title>[\s\S]*?<\/title>/, metadata)
        .replace('<div id="root"></div>', `<div id="root">${articleMarkup(item, base)}</div><script id="article-data" type="application/json">${json}</script>`);
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
    const title = escape(topicLabel(topic));
    const description = escape(`News, stories, and ideas about ${topicLabel(topic)} on CoBanter.`);
    const metadata = `<title>${title} · CoBanter</title><link rel="canonical" href="${escape(url)}"><meta name="description" content="${description}"><meta property="og:type" content="website"><meta property="og:title" content="${title} · CoBanter"><meta property="og:description" content="${description}"><meta property="og:url" content="${escape(url)}"><meta name="twitter:card" content="summary">`;
    const links = topicArticles.get(topic)!.map(item => `<li><a href="${articlePath(item, base)}">${escape(item.title ?? "Article")}</a></li>`).join("");
    const markup = `<div class="app"><header class="app-header"><a class="app-title" href="${base}">CoBanter</a></header><main class="app-main"><h1>${title}</h1><p>${description}</p>${links ? `<ul>${links}</ul>` : "<p>No posts here yet.</p>"}<a href="${base}">All topics</a></main></div>`;
    writeFileSync(path.join(directory, "index.html"), shell.replace(/<title>[\s\S]*?<\/title>/, metadata).replace('<div id="root"></div>', `<div id="root">${markup}</div>`));
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
  writeFileSync(path.join(dist, "404.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Page not found · CoBanter</title><body><h1>Page not found</h1><p>This address doesn't match a published article or topic.</p><a href="${base}">Return to CoBanter</a></body></html>`);
  const bytes = (directory: string): number => readdirSync(directory).reduce((sum, name) => {
    const file = path.join(directory, name), info = statSync(file);
    return sum + (info.isDirectory() ? bytes(file) : info.size);
  }, 0);
  const total = bytes(dist);
  console.log(`[archive] ${count} permanent articles; ${TOPICS.length} topic pages; ${(total / 1024 / 1024).toFixed(2)} MiB deployed output; ${INDEX_PAGE_SIZE} batch refs per index page.`);
  if (total > 750 * 1024 * 1024) console.warn("[archive] Capacity review needed: output exceeds 750 MiB. Preserve all content; plan additional capacity.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) buildArchive();
