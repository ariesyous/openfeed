// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { coverageUrl, coveredUrlKeys } from "../editorial/coverage";
import { makeEditorialWorld } from "../editorial/state";
import { collectSources, SOURCE_FEEDS } from "../editorial/sources";
import { WorldStateSchema } from "../worldState";
import type { FeedItem } from "../../schemas";

// The Conversation republished article 294387 under a new slug after the referendum.
const original = "https://theconversation.com/alberta-and-quebec-referendums-test-canadian-unity-amid-hostility-from-the-u-s-294387";
const republished = "https://theconversation.com/two-provinces-two-paths-alberta-rejects-independence-as-quebec-weighs-its-own-referendum-294387";
const different = "https://theconversation.com/how-canada-can-better-track-what-happens-to-trafficked-wildlife-after-theyre-seized-293935";
const date = new Date("2026-10-20T12:00:00Z");
// Synthetic prose; The Conversation has no page adapter, so only full feed content is usable.
const prose = "<p>The two provinces faced different questions when voters considered their place in the federation. Officials in each capital described the stakes in sharply different terms, and observers noted that the campaigns had developed along separate timelines.</p><p>Analysts said the outcome in one province would shape expectations in the other, although neither vote settled every constitutional question. The article examined those differences rather than predicting a single result.</p>";
const entry = (title: string, url: string) => `<entry><title>${title}</title><link href="${url}"/><published>${date.toISOString()}</published><content type="html"><![CDATA[${prose}]]></content></entry>`;

describe("The Conversation article-ID coverage", () => {
  it("treats two slugs with the same article ID as one source, and different IDs as distinct", () => {
    expect(coverageUrl(republished)).toBe(coverageUrl(original));
    expect(coverageUrl(`${republished}?utm_source=feed`)).toBe(coverageUrl(original));
    expect(coverageUrl(different)).not.toBe(coverageUrl(original));
  });

  it("leaves other publishers and non-article paths keyed by their exact URL", () => {
    for (const url of [
      "https://example.com/alberta-and-quebec-referendums-294387",
      "https://theconversation.com.attacker.example/some-story-294387",
      "https://theconversation.com/profiles/some-author-294387",
      "https://theconversation.com/ca/articles.atom",
    ]) expect(coverageUrl(url)).toBe(url);
  });

  it("blocks a new slug using coverage recorded under the original URL", () => {
    const initial = WorldStateSchema.parse({
      initialized: false, cycleCount: 0, communities: [], activeStorylines: [], characters: [],
      runningJokes: [], recentConflicts: [], currentTrends: [], unresolvedThreads: [], recentBatchSummaries: [],
    });
    const item = {
      id: "post", authorId: "editorial-explainer", kind: "text_post", community: "canada",
      title: "Two referendums", body: "A sourced explanation.", createdAt: date.toISOString(),
      meta: { kind: "generic" }, comments: [],
      engagement: { likes: 0, replies: 0, reposts: 0, views: 0, viralityScore: 0 },
      editorial: { format: "explainer", basis: "publisher_excerpt", sources: [{
        url: original, title: "Alberta and Quebec referendums", publisher: "The Conversation Canada",
        publishedAt: date.toISOString(), retrievedAt: date.toISOString(),
      }] },
    } as FeedItem;
    const world = makeEditorialWorld(initial, [item], date, "run");
    // The state file keeps the exact URL; the article key is derived when checking.
    expect(world.coveredSourceUrls).toEqual([original]);
    const covered = coveredUrlKeys(world.coveredSourceUrls ?? []);
    expect(covered.has(coverageUrl(republished))).toBe(true);
    expect(covered.has(coverageUrl(different))).toBe(false);
  });

  it("filters a republished slug from intake but still accepts a different article", async () => {
    const feed = SOURCE_FEEDS.find(f => f.publisher === "The Conversation Canada")!;
    const xml = `<feed>${entry("Two provinces, two paths", republished)}${entry("Tracking trafficked wildlife", different)}</feed>`;
    const fetcher = vi.fn(async (url: string | URL | Request) => String(url) === feed.url ? new Response(xml) : new Response("unavailable", { status: 503 }));
    const sources = await collectSources(date, fetcher as typeof fetch, new Set([original]), new Set());
    expect(sources.map(source => source.url)).toEqual([different]);
  });

  it("collapses two slugs of one article within a single intake", async () => {
    const feed = SOURCE_FEEDS.find(f => f.publisher === "The Conversation Canada")!;
    const xml = `<feed>${entry("Alberta and Quebec referendums", original)}${entry("Two provinces, two paths", republished)}</feed>`;
    const fetcher = vi.fn(async (url: string | URL | Request) => String(url) === feed.url ? new Response(xml) : new Response("unavailable", { status: 503 }));
    const sources = await collectSources(date, fetcher as typeof fetch);
    expect(sources).toHaveLength(1);
    expect(coverageUrl(sources[0].url)).toBe(coverageUrl(original));
  });
});
