import { describe, expect, it, vi } from "vitest";
import {
  collectSources,
  parseSourceFeed,
  type SourcePacket,
  SOURCE_FEEDS,
} from "../editorial/sources";
import { articleExcerpt } from "../editorial/evergreen";
import { enrichEditorial, validateDraft } from "../editorial/generate";
const now = new Date("2026-09-15T21:00:00Z");
const source: SourcePacket = {
  id: "source1",
  url: "https://www.bbc.co.uk/news/test",
  publisher: "BBC Technology",
  title: "A real report",
  topic: "technology",
  excerpt:
    "The publisher reports that the new system will be tested before any broader release is considered.",
  publishedAt: "2026-09-15T12:00:00Z",
  retrievedAt: now.toISOString(),
};
const post = {
  format: "news" as const,
  title: "A cautious rollout",
  body: "The publisher reports a trial before a wider release.",
  sourceIds: [source.id],
  evidence: [{ sourceId: source.id, quote: "the new system will be tested" }],
};
function rss(link: string, date = source.publishedAt!) {
  return `<rss><channel><item><title>Test</title><link>${link}</link><pubDate>${date}</pubDate><description>${source.excerpt}</description></item></channel></rss>`;
}
describe("source ingestion", () => {
  it("normalizes tracking URLs and accepts valid recent publisher articles", () => {
    const result = parseSourceFeed(
      rss("https://www.bbc.co.uk/news/test?at_medium=RSS&amp;at_campaign=rss"),
      SOURCE_FEEDS[0],
      now,
    );
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe(source.url);
  });
  it("rejects stale, future, off-domain, and non-HTTPS sources", () => {
    for (const xml of [
      rss(source.url, "2026-08-01"),
      rss(source.url, "2026-09-16"),
      rss("https://bbc.co.uk.attacker.example/a"),
      rss("http://www.bbc.co.uk/a"),
    ])
      expect(parseSourceFeed(xml, SOURCE_FEEDS[0], now)).toEqual([]);
  });
  it("rejects XML entity declarations but tolerates literal HTML in CDATA", () => {
    expect(() =>
      parseSourceFeed(
        '<!DOCTYPE rss [<!ENTITY a "x">]><rss/>',
        SOURCE_FEEDS[0],
        now,
      ),
    ).toThrow();
    const xml = rss(source.url)
      .replace("<description>", "<description><![CDATA[<!DOCTYPE html>")
      .replace("</description>", "]]></description>");
    expect(parseSourceFeed(xml, SOURCE_FEEDS[0], now)).toHaveLength(1);
  });
  it("returns no candidates on network failure instead of inventing sources", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await collectSources(now, fetcher)).toEqual([]);
    vi.restoreAllMocks();
  });
});
describe("grounded drafts", () => {
  it("only attaches source URLs and dates from the retrieved packet", () => {
    const items = enrichEditorial({ posts: [post] }, [source], now, "run1");
    expect(items[0].editorial?.sources[0].url).toBe(source.url);
    expect(items[0].editorial?.sources[0].publishedAt).toBe(source.publishedAt);
    expect(items[0].engagement.likes).toBe(0);
  });
  it("rejects fabricated citations and unsupported evidence", () => {
    expect(
      validateDraft(
        { posts: [{ ...post, sourceIds: ["invented"] }] },
        [source],
        now,
      ).ok,
    ).toBe(false);
    expect(
      validateDraft(
        {
          posts: [
            {
              ...post,
              evidence: [
                { sourceId: source.id, quote: "an invented factual quotation" },
              ],
            },
          ],
        },
        [source],
        now,
      ).ok,
    ).toBe(false);
  });
  it("rejects duplicate coverage and stale news, but permits a dated explainer", () => {
    expect(validateDraft({ posts: [post, post] }, [source], now).ok).toBe(
      false,
    );
    const older = { ...source, publishedAt: "2026-09-10T12:00:00Z" };
    expect(validateDraft({ posts: [post] }, [older], now).ok).toBe(false);
    expect(
      validateDraft({ posts: [{ ...post, format: "explainer" }] }, [older], now)
        .ok,
    ).toBe(true);
  });
});


describe("generated discussions", () => {
  const turn = {voice: "Take", body: "A trial is a sensible place to start.", evidence: post.evidence};
  it("validates discussion evidence and keeps generated voices separate from people and engagement", () => {
    const draft = {posts: [{...post, discussion: [turn, {...turn, voice: "Pushback", body: "A trial still leaves the wider rollout unresolved."}]}]};
    expect(validateDraft(draft, [source], now).ok).toBe(true);
    const parsed = validateDraft(draft, [source], now);
    if (!parsed.ok) throw new Error("invalid fixture");
    const item = enrichEditorial(parsed.value, [source], now, "discussion")[0];
    expect(item.editorial?.discussion).toHaveLength(2);
    expect(item.comments).toEqual([]);
    expect(item.engagement.replies).toBe(0);
    draft.posts[0].discussion[1].evidence = [{sourceId: "unknown", quote: "fabricated premise here"}];
    expect(validateDraft(draft, [source], now).ok).toBe(false);
  });
  it("rejects invented evidence and URLs inside discussion text", () => {
    for (const bad of [
      {...turn, evidence: [{sourceId: source.id, quote: "not contained in the source"}]},
      {...turn, body: "Read https://attacker.example for more."},
    ]) expect(validateDraft({posts: [{...post, discussion: [turn, bad]}]}, [source], now).ok).toBe(false);
  });
  it("accepts undated background readings but never promotes them to news", () => {
    const evergreen = {...source, publishedAt: undefined, evergreen: true};
    expect(validateDraft({posts: [post]}, [evergreen], now).ok).toBe(false);
    expect(validateDraft({posts: [{...post, format: "explainer"}]}, [evergreen], now).ok).toBe(true);
    expect(validateDraft({posts: [post]}, [{...evergreen, publishedAt: now.toISOString()}], now).ok).toBe(false);
  });
});


describe("evergreen article extraction", () => {
  it("extracts prose only from an article and ignores scripts and navigation", () => {
    const prose = source.excerpt.repeat(4);
    expect(articleExcerpt(`<nav><p>${prose}</p></nav><article><script>${prose}</script><p>${prose}</p></article>`)).toBe(prose);
    expect(articleExcerpt(`<body><p>${prose}</p></body>`)).toBe("");
  });
});
