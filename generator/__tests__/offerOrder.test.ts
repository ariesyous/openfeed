// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { writerFixture } from "./helpers/transport";
import { EDITORIAL_MAX_SHELF_PAGES, generateEditorial } from "../editorial/generate";
import { prepareEvidence } from "../editorial/evidence";
import { orderOfferCandidates, paceShelf, PREFERRED_TOPICS } from "../editorial/offerOrder";
import type { SourcePacket } from "../editorial/sources";

vi.mock("../editorial/review", async importOriginal => ({
  ...await importOriginal<typeof import("../editorial/review")>(),
  reviewEditorial: (await import("./helpers/review")).approveReview,
}));

const now = new Date("2026-10-22T00:00:00Z");
const sentence = (label: string) => `${label} describes a carefully documented episode that readers can follow from start to finish.`;
const packet = (id: string, topic: string, extra: Partial<SourcePacket> = {}): SourcePacket => ({
  id, topic, publisher: `Publisher ${id}`, title: `Title ${id}`, url: `https://example.com/${id}`,
  excerpt: sentence(id), publishedAt: now.toISOString(), retrievedAt: now.toISOString(), ...extra,
});
const empty = { acceptedByTopic: new Map(), offersByTopic: new Map(), offersBySource: new Map() };

describe("offer ordering", () => {
  it("puts preferred topics first, then keeps intake order, without dropping candidates", () => {
    const packets = [packet("tech", "technology"), packet("world", "world"), packet("phil", "philosophy"), packet("myth", "greek_roman_mythology"), packet("sop", "the_sopranos")];
    const ordered = orderOfferCandidates(packets, empty);
    expect(ordered.map(p => p.topic)).toEqual([...PREFERRED_TOPICS, "technology", "world"]);
    expect(new Set(ordered)).toEqual(new Set(packets));
  });

  it("rotates topics by accepted posts, then by offers, so preference is only a tie-break", () => {
    const packets = [packet("tech", "technology"), packet("phil", "philosophy"), packet("myth", "greek_roman_mythology")];
    const afterAccepted = orderOfferCandidates(packets, { ...empty, acceptedByTopic: new Map([["greek_roman_mythology", 1]]) });
    expect(afterAccepted.map(p => p.topic)).toEqual(["philosophy", "technology", "greek_roman_mythology"]);
    const afterOffers = orderOfferCandidates(packets, { ...empty, offersByTopic: new Map([["philosophy", 1], ["greek_roman_mythology", 1]]) });
    expect(afterOffers.map(p => p.topic)).toEqual(["technology", "greek_roman_mythology", "philosophy"]);
  });

  it("within a topic prefers unoffered sources, then shelf pages, then longer context", () => {
    const feedLong = packet("feed-long", "philosophy", { excerpt: sentence("long").repeat(5) });
    const shelf = packet("shelf", "philosophy", { evergreen: true, publishedAt: undefined });
    const feedShort = packet("feed-short", "philosophy");
    expect(orderOfferCandidates([feedShort, feedLong, shelf], empty).map(p => p.id)).toEqual(["shelf", "feed-long", "feed-short"]);
    const offered = { ...empty, offersBySource: new Map([["shelf", 1]]) };
    expect(orderOfferCandidates([feedShort, feedLong, shelf], offered).map(p => p.id)).toEqual(["feed-long", "feed-short", "shelf"]);
  });

  it("paces shelf pages round-robin across topics, keeps revisions first and never drops feed candidates", () => {
    const shelf = (id: string, topic: string) => packet(id, topic, { evergreen: true, publishedAt: undefined });
    const ordered = [shelf("sop-1", "the_sopranos"), shelf("sop-2", "the_sopranos"), packet("feed", "the_sopranos"),
      shelf("myth-1", "greek_roman_mythology"), shelf("phil-1", "philosophy"), packet("news", "world")];
    expect(paceShelf(ordered, 3).map(p => p.id)).toEqual(["sop-1", "feed", "myth-1", "phil-1", "news"]);
    expect(paceShelf(ordered, 1, new Set(["sop-2"])).map(p => p.id)).toEqual(["sop-2", "feed", "news"]);
    expect(paceShelf(ordered, 0).map(p => p.id)).toEqual(["feed", "news"]);
    expect(paceShelf(ordered, -1).map(p => p.id)).toEqual(["feed", "news"]);
  });

  it("lets callers keep their within-topic order; the default still prefers the longest excerpt", () => {
    const short = packet("short", "philosophy");
    const long = packet("long", "philosophy", { excerpt: sentence("long").repeat(3) });
    expect(prepareEvidence([short, long], { sourceLimit: 1 }).sources[0].title).toBe("Title long");
    expect(prepareEvidence([short, long], { sourceLimit: 1, keepTopicOrder: true }).sources[0].title).toBe("Title short");
  });
});

describe("generation offers", () => {
  // Long sectioned feed contexts appear first in intake, as in production; shelf pages follow.
  const article = (label: string) => Array.from({ length: 8 }, (_, k) => `The ${label} report describes development number ${k + 1}, with its own date and detail.`).join(" ");
  const news = ["technology", "science", "world", "canada", "united_states", "economics"].flatMap(topic => [1, 2].map(n => packet(`${topic}-${n}`, topic, {
    excerpt: article(`${topic} ${n}`), sections: [article(`${topic} ${n}`)], contextKind: "article" as const,
  })));
  const shelf = [...PREFERRED_TOPICS].flatMap(topic => [1, 2].map(n => packet(`${topic}-shelf-${n}`, topic, { evergreen: true, publishedAt: undefined })));
  const packets = [...news, ...shelf];

  it("offers lasting, under-covered topics early and rotates every topic through the run", async () => {
    const offers: string[][] = [];
    const fetchImpl: typeof fetch = async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      const input = JSON.parse(request.messages[1].content.split("\n\nYour previous")[0]);
      offers.push(input.sources.map((source: { topic: string }) => source.topic));
      // Choose the first offered sources, as a writer that follows the offer order would.
      const posts = input.sources.slice(0, input.maxPosts).map((source: { title: string; evidence: { id: string }[] }) => ({
        format: "explainer", title: source.title, body: "The source documents the episode in detail.", topic: null, spoilers: null,
        evidenceIds: [source.evidence[0].id],
        discussion: [
          { voice: "Take", body: "The documented sequence is the useful part.", evidenceIds: [source.evidence[0].id] },
          { voice: "Pushback", body: "One documented episode is still only one episode.", evidenceIds: [source.evidence[0].id] },
        ],
      }));
      return new Response(JSON.stringify({ model: "test/resolved", choices: [{ finish_reason: "stop", message: { content: JSON.stringify(writerFixture({ posts })) } }] }));
    };
    const items = await generateEditorial("secret", packets, now, "offers", [], { fetchImpl });
    expect(offers[0]).toEqual(expect.arrayContaining([...PREFERRED_TOPICS]));
    // Before any topic is offered twice, every topic with candidates has been offered once.
    const firstPass = offers.flat().slice(0, 9);
    expect(new Set(firstPass)).toEqual(new Set([...PREFERRED_TOPICS, "technology", "science", "world", "canada", "united_states", "economics"]));
    const topics = items.map(item => item.community);
    for (const topic of PREFERRED_TOPICS) expect(topics).toContain(topic);
    // A preference, not a quota: news topics still publish, and publisher limits still apply.
    expect(topics.filter(topic => !PREFERRED_TOPICS.includes(topic)).length).toBeGreaterThan(0);
    expect(new Set(items.flatMap(item => item.editorial!.sources.map(source => source.url))).size).toBe(items.length);
  });

  it("paces the finite shelf: one edition publishes at most the shelf cap and offers no more than it may still use", async () => {
    const manyShelf = [...PREFERRED_TOPICS, "movies"].flatMap(topic => [1, 2, 3].map(n => packet(`${topic}-shelf-${n}`, topic, { evergreen: true, publishedAt: undefined })));
    const shelfIds = new Set(manyShelf.map(p => p.title));
    let acceptedShelf = 0;
    const fetchImpl: typeof fetch = async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      const input = JSON.parse(request.messages[1].content.split("\n\nYour previous")[0]);
      const offeredShelf = input.sources.filter((source: { title: string }) => shelfIds.has(source.title));
      expect(offeredShelf.length).toBeLessThanOrEqual(EDITORIAL_MAX_SHELF_PAGES - acceptedShelf);
      // A writer that always prefers shelf pages, so only pacing can hold it back.
      const chosen = [...offeredShelf, ...input.sources.filter((source: { title: string }) => !shelfIds.has(source.title))].slice(0, input.maxPosts);
      acceptedShelf += chosen.filter((source: { title: string }) => shelfIds.has(source.title)).length;
      const posts = chosen.map((source: { title: string; evidence: { id: string }[] }) => ({
        format: "explainer", title: source.title, body: "The source documents the episode in detail.", topic: null, spoilers: null,
        evidenceIds: [source.evidence[0].id],
        discussion: [
          { voice: "Take", body: "The documented sequence is the useful part.", evidenceIds: [source.evidence[0].id] },
          { voice: "Pushback", body: "One documented episode is still only one episode.", evidenceIds: [source.evidence[0].id] },
        ],
      }));
      return new Response(JSON.stringify({ model: "test/resolved", choices: [{ finish_reason: "stop", message: { content: JSON.stringify(writerFixture({ posts })) } }] }));
    };
    const items = await generateEditorial("secret", [...news, ...manyShelf], now, "paced", [], { fetchImpl });
    const shelfItems = items.filter(item => item.editorial!.sources.some(source => shelfIds.has(source.title)));
    expect(shelfItems).toHaveLength(EDITORIAL_MAX_SHELF_PAGES);
    // Pacing never starves the rest of the edition.
    expect(items.length).toBeGreaterThan(EDITORIAL_MAX_SHELF_PAGES);
  });
});
