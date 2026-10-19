// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { sourceArticleSections } from "../editorial/articleText";
import { ARTICLE_FETCH_CONCURRENCY, collectArticleContext, contextCandidates, MAX_ARTICLE_FETCHES, MAX_PUBLISHER_CANDIDATES } from "../editorial/context";
import { prepareEvidence } from "../editorial/evidence";
import { collectSources, parseSourceFeed, SOURCE_FEEDS, type SourcePacket } from "../editorial/sources";
import { coverageTitle } from "../editorial/coverage";

// Synthetic prose in reduced, inspected publisher layouts; no copied full articles.
const opening = "The workshop faced a practical problem when the flexible wall had to move underwater. The designers tested several materials before choosing a layered construction. Their first prototype survived repeated movement, although the trial did not establish how it would behave during a longer production. That limitation remained part of the team's assessment.";
const mechanism = "A thin flexible skin was attached to a stronger outer backing. The backing carried the load while the inner layer supplied the visible texture. Separate supports moved the structure without requiring the skin to carry the machinery. This arrangement was tested under the specific conditions of the production, rather than certified for every possible use.";
const date = new Date("2026-10-18T00:00:00Z");
const packet: SourcePacket = { id: "one", publisher: "Psyche", topic: "philosophy", title: "A workshop's layered construction",
  url: "https://psyche.co/ideas/workshop", excerpt: "This is only a short promotional description without the mechanism.", publishedAt: date.toISOString(), retrievedAt: date.toISOString() };
const page = `<html><body><nav><p>Navigation must not become evidence.</p></nav><div class="article-content text-copy"><p>${opening}</p><aside><p>Unrelated feature about a different workshop.</p></aside><h2>Construction</h2><p>${mechanism}</p></div><article><p>Recommended reading must not become the body.</p></article></body></html>`;

describe("bounded article context", () => {
  it.each([
    ["CBC Canada", '<div class="story">', '</div>'],
    ["PBS NewsHour", '<article><div class="body-text">', '</div></article>'],
    ["NPR", '<div id="storytext">', '</div>'],
    ["Psyche", '<div class="article-content text-copy">', '</div>'],
    ["Variety Film", '<div class="a-content a-content--logo-end">', '</div>'],
    ["BBC World", '<article>', '</article>'],
    ["MIT News", '<div class="news-article--content--body--inner">', '</div>'],
    ["Ars Technica", '<article class="h-entry"><div class="post-content">', '</div></article>'],
    ["Aeon", '<div id="article-content" class="article-content"><div class="has-dropcap">', '</div></div>'],
    ["JSTOR Daily", '<div class="entry-content">', '</div>'],
  ])("extracts the inspected %s body and retains distinct sections", (publisher, start, end) => {
    const html = `<!DOCTYPE html><nav>Menu</nav>${start}<p>${opening}</p><aside><p>Unrelated prose.</p></aside><h2>Mechanism</h2><p>${mechanism}</p>${end}`;
    expect(sourceArticleSections(html, publisher)).toEqual([opening, mechanism]);
    expect(sourceArticleSections('<article><p>' + opening + '</p></article>', publisher)).toEqual(publisher === "BBC World" ? [opening] : []);
  });

  it("handles real HTML nesting and scripts without executing or absorbing them", () => {
    const html = '<nav><div>Menu</div></nav><script>const text = "<div>";</script>' + page;
    expect(sourceArticleSections(html, "Psyche")).toEqual([opening, mechanism]);
    expect(sourceArticleSections(page.replace('class="article-content text-copy"', 'class="unknown"'), "Psyche")).toEqual([]);
    expect(sourceArticleSections(page + page, "Psyche")).toEqual([]);
  });

  it("retains separate Ars body blocks and excludes author bios and layout modules", () => {
    const html = `<article class="h-entry"><div class="post-content post-content-double"><p>${opening}</p></div><div class="advertisement"><p>An unrelated promotion.</p></div><div class="post-content post-content-double"><p>${mechanism}</p></div><div class="author-bio"><p>An unrelated biography.</p></div></article>`;
    expect(sourceArticleSections(html, "Ars Technica")).toEqual([opening, mechanism]);
    expect(sourceArticleSections(html.replaceAll("post-content", "unknown-content"), "Ars Technica")).toEqual([]);
    expect(sourceArticleSections(html + html, "Ars Technica")).toEqual([]);
  });
  it.each([
    ["Aeon", '<div id="article-content" class="article-content"><div class="has-dropcap">', "pullquote"],
    ["JSTOR Daily", '<div class="entry-content">', "daily_email_signup"],
  ])("excludes inspected %s promotional/duplicate modules without reconnecting paragraphs", (publisher, start, moduleClass) => {
    expect(sourceArticleSections(`${start}<p>${opening}</p><div class="${moduleClass}"><p>Unrelated signup or duplicate pull quote.</p></div><p>${mechanism}</p></div>`, publisher)).toEqual([opening, mechanism]);
    expect(sourceArticleSections(`<div class="unknown"><p>${opening}</p></div>`, publisher)).toEqual([]);
  });
  it("requires Aeon's essay body and excludes adjacent audio labels", () => {
    const before = '<div id="article-content" class="article-content"><p>Listen to this essay</p><p>25 minute listen</p>';
    expect(sourceArticleSections(`${before}<div class="has-dropcap"><p>${opening}</p></div></div>`, "Aeon")).toEqual([opening]);
    expect(sourceArticleSections(`${before}<p>${opening}</p></div>`, "Aeon")).toEqual([]);
  });

  it("keeps complete paragraphs, rejects declarations and never jumps past oversized prose", () => {
    expect(sourceArticleSections('<!DOCTYPE html [<!ENTITY x SYSTEM "file:///bad">]>' + page, "Psyche")).toEqual([]);
    expect(sourceArticleSections("x".repeat(1_000_001), "Psyche")).toEqual([]);
    expect(sourceArticleSections(`<div class="article-content text-copy"><p>${opening}</p><p>${"x".repeat(6100)}</p><h2>Later</h2><p>${mechanism}</p></div>`, "Psyche")).toEqual([opening]);
  });

  it("exposes later mechanisms without joining section boundaries or dropping sentence tails", () => {
    const sections = [opening, mechanism];
    const rich = { ...packet, excerpt: sections.join("\n\n"), sections };
    const prepared = prepareEvidence(Array.from({ length: 12 }, (_, i) => ({ ...rich, id: `p${i}` })));
    expect(prepared.sources).toHaveLength(8);
    const evidence = prepared.sources[0].evidence;
    expect(evidence.some(e => e.section === 2 && e.text.includes("backing"))).toBe(true);
    expect(evidence.length).toBeLessThanOrEqual(24);
    for (const e of evidence) {
      expect(sections[e.section! - 1]).toContain(e.text);
      const group = evidence.filter(x => x.contextGroup === e.contextGroup);
      expect(group).toHaveLength(e.parts);
      expect(e.text.split(/\s+/).length).toBeLessThanOrEqual(25);
    }
  });

  it("replaces the blurb, preserves source identity/dates, and bounds requests", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.redirect).toBe("error"); expect(init?.signal).toBeInstanceOf(AbortSignal);
      return new Response(page);
    });
    const [result] = await collectArticleContext([packet], fetcher as typeof fetch);
    expect(result).toMatchObject({ ...packet, excerpt: [opening, mechanism].join("\n\n"), sections: [opening, mechanism], contextKind: "article" });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe(packet.url);
  });

  it("skips failed, oversized, thin, off-domain and non-HTTPS pages without reverting to blurbs", async () => {
    for (const response of [new Response("denied", { status: 403 }), new Response("x".repeat(1_000_001)), new Response('<div class="article-content text-copy"><p>Too thin.</p></div>')]) {
      expect(await collectArticleContext([packet], async () => response)).toEqual([]);
    }
    const fetcher = vi.fn();
    for (const url of ["http://psyche.co/a", "https://psyche.co.attacker.example/a", "https://user:pass@psyche.co/a", "https://psyche.co:444/a"]) {
      expect(await collectArticleContext([{ ...packet, url }], fetcher)).toEqual([]);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses full feed prose, but not a description masquerading as an article", async () => {
    const feed = SOURCE_FEEDS.find(f => f.publisher === "Psyche")!;
    const xml = (field: string) => `<rss><channel><item><title>Workshop</title><link>${packet.url}</link><pubDate>${date.toISOString()}</pubDate><${field}><![CDATA[<p>${opening}</p><h2>Next</h2><p>${mechanism}</p>]]></${field}></item></channel></rss>`;
    const [full] = parseSourceFeed(xml("content:encoded"), feed, date);
    expect(full.sections).toEqual([opening, mechanism]);
    const fetcher = vi.fn();
    expect(await collectArticleContext([full], fetcher)).toEqual([full]);
    expect(fetcher).not.toHaveBeenCalled();
    expect(parseSourceFeed(xml("description"), feed, date)[0].contextKind).toBeUndefined();
    const escaped = `<feed><entry><title>Workshop</title><link href="${packet.url}"/><published>${date.toISOString()}</published><content type="html">&lt;p&gt;${opening}&lt;/p&gt;&lt;h2&gt;Next&lt;/h2&gt;&lt;p&gt;${mechanism}&lt;/p&gt;</content></entry></feed>`;
    expect(parseSourceFeed(escaped, feed, date)[0].sections).toEqual([opening, mechanism]);
  });

  it("filters covered URLs and titles before fetching any article", async () => {
    const feed = SOURCE_FEEDS.find(f => f.publisher === "Psyche")!;
    const xml = `<rss><channel><item><title>${packet.title}</title><link>${packet.url}</link><pubDate>${date.toISOString()}</pubDate><description>${opening}</description></item></channel></rss>`;
    const fetcher = vi.fn(async (url: string | URL | Request) => String(url) === feed.url ? new Response(xml) : new Response("unavailable", { status: 503 }));
    await collectSources(date, fetcher as typeof fetch, new Set(), new Set([coverageTitle(packet.title)]));
    expect(fetcher.mock.calls.some(([url]) => url === packet.url)).toBe(false);
  });

  it("bounds topic-diverse selection and concurrent retrieval", async () => {
    const packets = Array.from({ length: 600 }, (_, i) => {
      const feed = SOURCE_FEEDS[i % SOURCE_FEEDS.length];
      return { ...packet, id: `id${i}`, publisher: feed.publisher, topic: feed.topic, title: `Article ${i}`, url: `https://${feed.hosts[0]}/article-${i}`, contextKind: "feed_article" as const };
    });
    const selected = contextCandidates(packets);
    expect(selected.length).toBe(MAX_ARTICLE_FETCHES);
    expect(new Set(selected.map(p => p.topic)).size).toBeGreaterThan(5);
    expect(selected.filter(p => p.publisher.startsWith("BBC")).length).toBeLessThanOrEqual(MAX_PUBLISHER_CANDIDATES);
    let active = 0, peak = 0;
    await collectArticleContext(packets, async () => {
      peak = Math.max(peak, ++active); await new Promise(resolve => setTimeout(resolve, 1)); active--;
      return new Response(page);
    });
    expect(peak).toBeLessThanOrEqual(ARTICLE_FETCH_CONCURRENCY);
  });
});
