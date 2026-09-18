import { describe, expect, it, vi } from "vitest";
import {
  collectSources,
  parseSourceFeed,
  plainText,
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
  function atom(link = source.url, published = source.publishedAt!) {
    return `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
      <title type="text">An Atom article</title><published>${published}</published>
      <updated>2026-09-15T22:00:00Z</updated>
      <link rel="self" type="application/atom+xml" href="https://attacker.example/self"/>
      <link rel="enclosure" href="https://attacker.example/audio"/>
      <link rel="alternate" type="text/html" href="${link}"/>
      <content type="html">&lt;p&gt;${source.excerpt}&lt;/p&gt;</content>
    </entry></feed>`;
  }

  it("reads Atom article links and HTML content while retaining the original publication date", () => {
    const [packet] = parseSourceFeed(atom(), SOURCE_FEEDS[0], now);
    expect(packet.url).toBe(source.url);
    expect(packet.excerpt).toBe(source.excerpt);
    expect(packet.title).toBe("An Atom article");
    expect(packet.publishedAt).toBe(new Date(source.publishedAt!).toISOString());
    // A single link object and a plain summary are also valid Atom.
    const summary = `<feed><entry><title>Summary</title><published>${source.publishedAt}</published>
      <link href="${source.url}"/><summary>${source.excerpt}</summary></entry></feed>`;
    expect(parseSourceFeed(summary, SOURCE_FEEDS[0], now)[0].excerpt).toBe(source.excerpt);
  });

  it("applies date and URL restrictions to Atom and never substitutes an updated timestamp", () => {
    for (const xml of [
      atom().replace(/<published>.*?<\/published>/, ""),
      atom(source.url, "2026-08-01"), atom(source.url, "2026-09-16"),
      atom("http://www.bbc.co.uk/report"), atom("https://bbc.co.uk.attacker.example/report"),
      atom("https://user:pass@www.bbc.co.uk/report"), atom("https://www.bbc.co.uk:444/report"),
      atom().replace('rel="alternate"', 'rel="enclosure"'),
    ]) expect(parseSourceFeed(xml, SOURCE_FEEDS[0], now)).toEqual([]);
  });

  it("reads RSS 1.0 article-level Dublin Core dates and rejects invalid entries", () => {
    const rdf = (link: string, date: string) => `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <channel><dc:date>${source.publishedAt}</dc:date></channel>
      <item><title>RDF article</title><link>${link}</link><dc:date>${date}</dc:date>
      <description>${source.excerpt}</description></item></rdf:RDF>`;
    const [packet] = parseSourceFeed(rdf(source.url, source.publishedAt!), SOURCE_FEEDS[0], now);
    expect(packet.publishedAt).toBe(new Date(source.publishedAt!).toISOString());
    expect(packet.excerpt).toBe(source.excerpt);
    for (const [link, date] of [[source.url, ""], [source.url, "2026-08-01"],
      [source.url, "2026-09-16"], ["https://attacker.example/a", source.publishedAt!]]) {
      expect(parseSourceFeed(rdf(link, date), SOURCE_FEEDS[0], now)).toEqual([]);
    }
  });

  it("strips encoded and literal HTML without admitting scripts into source evidence", () => {
    for (const html of [
      `<p>${source.excerpt}</p><script>invented detail</script>`,
      `&lt;p&gt;${source.excerpt}&lt;/p&gt;&lt;script&gt;invented detail&lt;/script&gt;`,
      `&#60;p&#62;${source.excerpt}&#60;/p&#62;`,
    ]) expect(plainText(html)).toBe(source.excerpt);
    expect(parseSourceFeed(rss(source.url).replace(source.excerpt,
      `&lt;p&gt;${source.excerpt}&lt;/p&gt;`), SOURCE_FEEDS[0], now)[0].excerpt).toBe(source.excerpt);
  });

  it("bounds and sorts Atom intake and rejects entity declarations", () => {
    const entry = atom().match(/<entry>[\s\S]*?<\/entry>/)![0];
    const xml = `<feed>${Array.from({length: 12}, (_, i) => entry.replace(source.url, `${source.url}/${i}`)
      .replace(source.publishedAt!, `2026-09-${String(i + 1).padStart(2, "0")}T12:00:00Z`)).join("")}</feed>`;
    const packets = parseSourceFeed(xml, {...SOURCE_FEEDS[0], maxAgeDays: 30}, now);
    expect(packets).toHaveLength(8);
    expect(packets[0].publishedAt).toBe("2026-09-12T12:00:00.000Z");
    expect(packets.at(-1)!.publishedAt).toBe("2026-09-05T12:00:00.000Z");
    expect(() => parseSourceFeed('<!DOCTYPE feed [<!ENTITY x "unsafe">]>' + atom(), SOURCE_FEEDS[0], now)).toThrow();
  });

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
