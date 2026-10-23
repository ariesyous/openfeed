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

// Deutsche Welle republished each of these article IDs under new slugs; all were
// published more than once between September 19 and October 17 (generator/state/world.json).
const dwRepublished: Record<string, string[]> = {
  "79331945": ["iran-s-new-hezbollah-how-powerful-are-the-houthis-now", "yemeni-militants-how-powerful-are-the-houthis-now"],
  "79417294": ["propaganda-in-russian-schools-prepares-students-to-die", "russian-students-propaganda-in-school-prepares-them-to-die"],
  "79507122": ["israel-s-mental-health-crisis-in-the-wake-of-oct-7-attacks", "israel-s-mental-health-crisis-in-the-wake-of-october-7-attacks"],
  "79533857": ["voting-in-brazil-s-2026-presidential-election-has-begun-with-polls-showing-lula-and-bolsonaro-nearly-tied", "brazil-election-early-count-puts-bolsonaro-ahead-of-lula", "brazil-election-bolsonaro-and-lula-head-to-runoff"],
  "79535336": ["bosnia-herzegovina-votes-amid-divisive-campaigns-eu-bid", "nationalists-top-bosnia-herzegovina-s-divisive-election"],
  "79629555": ["ukrainian-prisoners-of-war-and-defectors-have-been-gathered-into-a-russian-battalion-to-face-ukrainian-forces-why-and-how", "who-are-the-ukrainian-volunteers-under-russian-command"],
  "79629971": ["couples-looking-to-have-children-often-turn-to-surrogacy-agencies-in-georgia-without-understanding-the-hidden-costs", "surrogacy-in-georgia-is-booming-but-at-what-cost"],
  "79634509": ["trump-announces-energy-ceasefire-between-russia-and-ukraine", "trump-claims-russia-and-ukraine-agreed-to-energy-ceasefire"],
  "79681977": ["iran-when-honor-becomes-a-death-sentence-for-women", "femicide-in-iran-when-honor-becomes-a-death-sentence"],
  "79685584": ["france-braces-for-nationwide-protests", "france-protesters-clash-with-police-in-nationwide-protests-amid-rising-social-polarization"],
};
const dwUrl = (slug: string, id: string) => `https://www.dw.com/en/${slug}/a-${id}?maca=en-rss-en-world-4025-rdf`;
const rdf = (items: [string, string][]) => `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">${items.map(([title, url]) =>
  `<item><title>${title}</title><link>${url}</link><dc:date>${date.toISOString()}</dc:date><content:encoded><![CDATA[${prose}]]></content:encoded></item>`).join("")}</rdf:RDF>`;

describe("Deutsche Welle article-ID coverage", () => {
  it("keys every observed republished slug on its article ID, ignoring the query", () => {
    for (const [id, slugs] of Object.entries(dwRepublished)) {
      expect(new Set(slugs.map(slug => coverageUrl(dwUrl(slug, id))))).toEqual(new Set([`dw.com#a-${id}`]));
    }
    expect(coverageUrl(`https://dw.com/en/some-slug/a-79681977/`)).toBe("dw.com#a-79681977");
    expect(coverageUrl("https://www.dw.com/en/some-slug/a-79681977")).toBe("dw.com#a-79681977");
    expect(new Set(Object.keys(dwRepublished).map(id => coverageUrl(dwUrl("same-slug", id)))).size).toBe(10);
  });

  it("leaves other DW paths, look-alike hosts and other publishers keyed by their exact URL", () => {
    for (const url of [
      "https://www.dw.com/en/top-stories/s-9097",
      "https://www.dw.com/en/some-slug/a-79681977/extra",
      "https://www.dw.com/en/some-slug/a-",
      "https://rss.dw.com/rdf/rss-en-world",
      "https://www.dw.com.attacker.example/en/some-slug/a-79681977",
      "https://example.com/en/some-slug/a-79681977",
    ]) expect(coverageUrl(url)).toBe(url);
  });

  it("blocks a new DW slug using coverage recorded under the original URL", async () => {
    const feed = SOURCE_FEEDS.find(f => f.publisher === "Deutsche Welle")!;
    const [first, second] = dwRepublished["79681977"].map(slug => dwUrl(slug, "79681977"));
    const other = dwUrl("france-braces-for-nationwide-protests", "79685584");
    const xml = rdf([["Femicide in Iran: When 'honor' becomes a death sentence", second], ["France braces for nationwide protests", other]]);
    const fetcher = vi.fn(async (url: string | URL | Request) => String(url) === feed.url ? new Response(xml) : new Response("unavailable", { status: 503 }));
    const sources = await collectSources(date, fetcher as typeof fetch, new Set([first]), new Set());
    expect(sources.map(source => source.url)).toEqual([other]);
  });
});
