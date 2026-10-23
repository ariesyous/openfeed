// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { writerFixture } from "./helpers/transport";
import { generateEditorial } from "../editorial/generate";
import { headlineTokens, sameEventIndex } from "../editorial/sameEvent";
import type { SourcePacket } from "../editorial/sources";

vi.mock("../editorial/review", async importOriginal => ({
  ...await importOriginal<typeof import("../editorial/review")>(),
  reviewEditorial: (await import("./helpers/review")).approveReview,
}));

// Published pairs from the October 9–22 calibration (docs/editorial-same-event.md).
const albertaGlobal = "Alberta Court of Appeal says Impact Assessment Act is still unconstitutional";
const albertaCbc = "Alberta Court of Appeal says Ottawa's Impact Assessment Act is still unconstitutional";
const fairiesVariety = "Cynthia Erivo’s ‘Bad Fairies’ Adds Kylie Minogue, Jonathan Groff and Catherine Tate to Voice Cast";
const fairiesDeadline = "Kylie Minogue, Jonathan Groff & Catherine Tate Join ‘Bad Fairies’ Cast With Cynthia Erivo";
const juliaVariety = "‘The Julia Set,’ Starring Chase Infiniti, Lands at Sony Pictures Classics Following TIFF Premiere";
const juliaDeadline = "Chase Infiniti-Starring ‘The Julia Set’ Acquired By Sony Pictures Classics After TIFF Premiere";

describe("same-event headline similarity", () => {
  it("normalizes case, punctuation, possessives, plurals, stopwords and years", () => {
    expect([...headlineTokens("Pope Leo's Surgeries: What the 2026 Rulings Say")]).toEqual(["pope", "leo", "surgery", "ruling"]);
  });

  it("matches the same event reported by different publishers", () => {
    expect(sameEventIndex([albertaCbc]).match(albertaGlobal)?.shared).toEqual(
      ["alberta", "court", "appeal", "impact", "assessment", "act", "still", "unconstitutional"]);
    expect(sameEventIndex([fairiesVariety]).match(fairiesDeadline)?.title).toBe(fairiesVariety);
    expect(sameEventIndex([juliaVariety]).match(juliaDeadline)?.title).toBe(juliaVariety);
  });

  it("requires three shared distinctive tokens", () => {
    // Only "riyadh" and "airport" overlap.
    expect(sameEventIndex(["Attack on Riyadh airport killed 12 people"]).match("Riyadh airport reopens to flights")).toBeUndefined();
    expect(sameEventIndex(["Attack on Riyadh airport killed 12 people"]).match("Riyadh airport attack another dangerous moment")).toBeDefined();
  });

  it("ignores tokens that are common across the recent reference headlines", () => {
    const series = ["How Eon built multi-cloud investigation on Amazon Bedrock AgentCore",
      "Generate presentations with Amazon Bedrock AgentCore", "Natural language security queries using Amazon Bedrock AgentCore"];
    // amazon/bedrock/agentcore appear in all three references, so they identify no event.
    expect(sameEventIndex(series).match("Build self-improving document processing using Amazon Bedrock AgentCore")).toBeUndefined();
    expect(sameEventIndex(series.slice(1)).match("Build self-improving document processing using Amazon Bedrock AgentCore")).toBeDefined();
  });

  it("is deterministic and order-independent for the same inputs", () => {
    const references = [albertaCbc, fairiesVariety, juliaVariety];
    for (const title of [albertaGlobal, fairiesDeadline, juliaDeadline, "Unrelated mythology essay"]) {
      expect(sameEventIndex(references).match(title)?.title).toBe(sameEventIndex([...references].reverse()).match(title)?.title);
    }
  });
});

const now = new Date("2026-10-16T12:00:00Z");
const packet = (id: string, title: string, publisher: string): SourcePacket => ({
  id, topic: "movies", publisher, title, url: `https://example.com/${id}`,
  excerpt: `${title}. The publisher reports the details in a carefully sourced article before any wider analysis.`,
  publishedAt: now.toISOString(), retrievedAt: now.toISOString(),
});
const completion = (value: unknown) => new Response(JSON.stringify({
  model: "test/resolved-model", choices: [{ finish_reason: "stop", message: { content: JSON.stringify(writerFixture(value)) } }],
}));
type Offered = { title: string; evidence: { id: string }[] };
const offeredSources = (init?: RequestInit): Offered[] =>
  JSON.parse(JSON.parse(String(init?.body)).messages[1].content.split("\n\nYour previous")[0]).sources;
const postFor = (entry: Offered) => ({
  format: "news", title: entry.title, body: "The publisher describes the announcement and its next step.", topic: null, spoilers: null,
  evidenceIds: [entry.evidence[0].id], discussion: [
    { voice: "Take", body: "The announcement is a clear signal of interest.", evidenceIds: [entry.evidence[0].id] },
    { voice: "Pushback", body: "One announcement still leaves the outcome open.", evidenceIds: [entry.evidence[0].id] },
  ],
});
// The mocked writer accepts the first offered source only, so each chunk is one post.
function firstOnlyWriter(offered: string[][]): typeof fetch {
  return async (_url, init) => {
    const sources = offeredSources(init);
    offered.push(sources.map(source => source.title));
    return completion({ posts: [postFor(sources[0])] });
  };
}

describe("same-event deferral during generation", () => {
  it("defers a candidate resembling a recently published source headline, for this run only", async () => {
    const logs: string[] = [];
    const logger = vi.spyOn(console, "log").mockImplementation(message => { logs.push(String(message)); });
    try {
      const packets = [packet("deadline", fairiesDeadline, "Deadline"), packet("other", "A mythology essay on Medusa", "Aeon")];
      const offered: string[][] = [];
      const items = await generateEditorial("secret", packets, now, "recent", [], {
        fetchImpl: firstOnlyWriter(offered), recentSourceTitles: [fairiesVariety],
      });
      expect(offered.flat()).not.toContain(fairiesDeadline);
      expect(items.map(item => item.title)).toEqual(["A mythology essay on Medusa"]);
      expect(logs.some(line => line.startsWith("[editorial] same-event deferral:") && line.includes("kylie, minogue"))).toBe(true);
      expect(logs.some(line => line.includes("sameEventDeferrals=1 "))).toBe(true);
      // Never durable: without the recent headline, the same candidate is publishable.
      const later = await generateEditorial("secret", packets.slice(0, 1), now, "later", [], { fetchImpl: firstOnlyWriter([]) });
      expect(later.map(item => item.title)).toEqual([fairiesDeadline]);
    } finally { logger.mockRestore(); }
  });

  it("defers a candidate resembling a source accepted earlier in the same run", async () => {
    const logger = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const packets = [packet("global", albertaGlobal, "Global News Canada"), packet("cbc", albertaCbc, "CBC Canada"),
        packet("essay", "A mythology essay on Medusa", "Aeon")];
      const offered: string[][] = [];
      const items = await generateEditorial("secret", packets, now, "same-run", [], { fetchImpl: firstOnlyWriter(offered) });
      // Both twins are offered before anything is accepted; offer order picks the first.
      expect(offered[0]).toEqual(expect.arrayContaining([albertaGlobal, albertaCbc]));
      const [first, ...rest] = items.map(item => item.title);
      const twin = first === albertaCbc ? albertaGlobal : albertaCbc;
      expect([albertaGlobal, albertaCbc]).toContain(first);
      expect(offered.slice(1).flat()).not.toContain(twin);
      expect(rest).toEqual(["A mythology essay on Medusa"]);
    } finally { logger.mockRestore(); }
  });
});
