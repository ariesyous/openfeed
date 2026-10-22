// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { writerFixture } from "./helpers/transport";
import { generateEditorial } from "../editorial/generate";
import { prepareEvidence } from "../editorial/evidence";
import { orderOfferCandidates, PREFERRED_TOPICS } from "../editorial/offerOrder";
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
});
