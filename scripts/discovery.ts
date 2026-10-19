import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { FeedItem } from "../schemas";
import { articlePath } from "../shared/articles";
import { absoluteUrl, escapeHtml, type SiteLocation } from "../shared/seo";
import { TOPICS, topicLabel, topicPath } from "../shared/topics";

// Below the protocol's 50,000 URL / 50 MiB limits, including long article slugs.
export const SITEMAP_PAGE_SIZE = 10_000;
export function sitemapFiles(urls: string[], site: SiteLocation, size = SITEMAP_PAGE_SIZE): Map<string, string> {
  if (!Number.isInteger(size) || size < 1 || size > SITEMAP_PAGE_SIZE) throw new Error("Invalid sitemap page size");
  const unique = [...new Set(urls)];
  const files = new Map<string, string>();
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const urlset = (page: string[]) => `${xml}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${page.map(url => `<url><loc>${escapeHtml(url)}</loc></url>`).join("\n")}\n</urlset>\n`;
  if (unique.length <= size) files.set("sitemap.xml", urlset(unique));
  else {
    for (let i = 0; i < unique.length; i += size) files.set(`sitemaps/page-${i / size + 1}.xml`, urlset(unique.slice(i, i + size)));
    files.set("sitemap.xml", `${xml}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...files.keys()].map(file => `<sitemap><loc>${escapeHtml(absoluteUrl(`${site.base}${file}`, site))}</loc></sitemap>`).join("\n")}\n</sitemapindex>\n`);
  }
  return files;
}

const markdownLabel = (value: string) => value.replace(/\s+/g, " ").replace(/[\\[\]<>]/g, "\\$&");
export function llmsText(site: SiteLocation, recent: FeedItem[]): string {
  return `# CoBanter

> CoBanter is a source-linked reading feed of news, explainers, real stories, and clearly labelled AI-written commentary and discussion.

Articles link to their original publishers. CoBanter's summaries, opinions, jokes, and discussion voices are AI-generated; voices are perspectives, not real people or eyewitnesses. Automated source and model review is fallible. Consult the linked originals for full context and factual verification.

The article's added date describes publication on CoBanter. Each source has its own original publication date; unavailable dates remain unknown. Older reading is not necessarily current news. Spoiler-marked bodies and discussions require an explicit reveal; avoid exposing them in previews or unsolicited answers.

## Start here

- [Latest reading](${absoluteUrl(site.base, site)}): Recent articles and topic navigation.
- [Complete article archive](${absoluteUrl(`${site.base}archive/`, site)}): Paginated HTML links to every permanent article, accessible without JavaScript.
- [Sitemap](${absoluteUrl(`${site.base}sitemap.xml`, site)}): Complete canonical page catalog, regenerated on every deployment.
- [Crawler policy](${absoluteUrl(`${site.base}robots.txt`, site)}): Crawler access rules; this guide does not override them.

## Topics

${TOPICS.map(topic => `- [${topicLabel(topic)}](${absoluteUrl(topicPath(topic, site.base), site)}): Source-linked reading and AI commentary.`).join("\n")}

## Recent articles

${recent.slice(0, 8).map(item => `- [${markdownLabel(item.title ?? "Article")}](${absoluteUrl(articlePath(item, site.base), site)})${item.editorial?.spoilers ? ": Contains spoilers behind a reveal control." : ""}`).join("\n")}

## Optional

- [Feed data index](${absoluteUrl(`${site.base}data/manifest.json`, site)}): JSON batch references. Follow olderManifest relative to the data/ directory for older indexes; batch file paths are also relative to data/. Only entries with editorial metadata are source-grounded articles. Each article URL also serves article.json containing its unchanged text, sources, dates, spoiler flag, and optional AI discussion. Article HTML includes the same content without requiring JavaScript.
`;
}

export function writeDiscovery(dist: string, site: SiteLocation, urls: string[], recent: FeedItem[]) {
  for (const [file, content] of sitemapFiles(urls, site)) {
    const target = path.join(dist, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  writeFileSync(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl(`${site.base}sitemap.xml`, site)}\n`);
  writeFileSync(path.join(dist, "llms.txt"), llmsText(site, recent));
}
