import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { FeedItem } from "../schemas";
import { articlePath } from "../shared/articles";
import { splitParagraphs } from "../shared/reading";
import { absoluteUrl, articleDescription, escapeHtml as escape, SITE_DESCRIPTION, topicDescription, type SiteLocation } from "../shared/seo";
import { TOPICS, topicLabel, topicPath, topicSlug } from "../shared/topics";

export const FEED_SIZE = 50;
export const feedPath = (topic: string, base: string) => topic ? `${topicPath(topic, base)}feed.xml` : `${base}feed.xml`;

/** Reader-facing HTML: full text and labelled discussion, but never spoiler-gated prose. */
export function feedContent(item: FeedItem, url: string): string {
  const editorial = item.editorial!;
  const sources = `<p><strong>${editorial.format === "banter" ? "Generated commentary · Source context" : "Based on publisher excerpts"}</strong></p><ul>${editorial.sources.map(source => `<li><a href="${escape(source.url)}">${escape(source.publisher)} — ${escape(source.title)}</a></li>`).join("")}</ul>`;
  if (editorial.spoilers) return `<p>This article contains spoilers. <a href="${escape(url)}">Open it on CoBanter</a> to reveal the text and discussion.</p>${sources}`;
  const body = splitParagraphs(item.body).map(paragraph => `<p>${escape(paragraph)}</p>`).join("");
  const discussion = (editorial.discussion ?? []).map(turn => `<p><strong>${escape(turn.voice)}:</strong> ${escape(turn.body)}</p>`).join("");
  return body + (discussion ? `<h3>AI-generated discussion</h3>${discussion}` : "") + sources
    + `<p><a href="${escape(url)}">Read on CoBanter</a></p>`;
}

export function rssFeed(items: FeedItem[], site: SiteLocation, topic = ""): string {
  const recent = items.slice(0, FEED_SIZE);
  const home = absoluteUrl(topicPath(topic, site.base), site);
  const self = absoluteUrl(feedPath(topic, site.base), site);
  const title = topic ? `${topicLabel(topic)} · CoBanter` : "CoBanter";
  const description = topic ? topicDescription(topic) : SITE_DESCRIPTION;
  // The newest article date keeps output stable between unchanged builds.
  const updated = recent[0] ? `<lastBuildDate>${new Date(recent[0].createdAt).toUTCString()}</lastBuildDate>` : "";
  const entries = recent.map(item => {
    const url = absoluteUrl(articlePath(item, site.base), site);
    return `<item><title>${escape(item.title ?? "Article")}</title><link>${escape(url)}</link><guid isPermaLink="true">${escape(url)}</guid>`
      + `<pubDate>${new Date(item.createdAt).toUTCString()}</pubDate><category>${escape(topicLabel(item.community))}</category>`
      + `<description>${escape(articleDescription(item))}</description><content:encoded>${escape(feedContent(item, url))}</content:encoded></item>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>${escape(title)}</title><link>${escape(home)}</link><description>${escape(description)}</description><language>en</language>${updated}
<atom:link href="${escape(self)}" rel="self" type="application/rss+xml"/>
<image><url>${escape(absoluteUrl(`${site.base}icon-192.png`, site))}</url><title>${escape(title)}</title><link>${escape(home)}</link></image>
${entries}
</channel>
</rss>
`;
}

/** `articles` must be sorted newest first. */
export function writeFeeds(dist: string, site: SiteLocation, articles: FeedItem[]) {
  writeFileSync(path.join(dist, "feed.xml"), rssFeed(articles, site));
  for (const topic of TOPICS) {
    const directory = path.join(dist, "topics", topicSlug(topic));
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, "feed.xml"), rssFeed(articles.filter(item => item.community === topic), site, topic));
  }
}

export function feedLinks(site: SiteLocation, topic = ""): string {
  const link = (href: string, title: string) => `<link rel="alternate" type="application/rss+xml" title="${escape(title)}" href="${escape(absoluteUrl(href, site))}">`;
  return link(feedPath("", site.base), "CoBanter") + (topic ? link(feedPath(topic, site.base), `${topicLabel(topic)} · CoBanter`) : "");
}
