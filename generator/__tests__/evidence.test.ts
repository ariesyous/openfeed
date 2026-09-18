import { describe, expect, it } from "vitest";
import { evidenceSpans, prepareEvidence } from "../editorial/evidence";
import { enrichEditorial, validateCitedDraft } from "../editorial/generate";
import type { SourcePacket } from "../editorial/sources";

const now = new Date("2026-09-16T00:00:00Z");
const source: SourcePacket = {
  id: "a", title: "A source title", publisher: "Publisher", topic: "science",
  excerpt: "This source has original  spacing and smart ‘quotes’. A model must not have to copy them.",
  url: "https://example.com/a", publishedAt: now.toISOString(), retrievedAt: now.toISOString(),
};
const post = {
  format: "explainer", title: "A grounded explanation", body: "An explanation of the research idea and its implications.",
  topic: null, spoilers: null, evidenceIds: ["S1E1"],
  discussion: [
    {voice: "Take", body: "An interpretation of the evidence.", evidenceIds: ["S1E1"]},
    {voice: "Pushback", body: "Another interpretation of the same premise.", evidenceIds: ["S1E1"]},
  ],
};

describe("numbered evidence", () => {
  it("copies exact original substrings within the existing quote limits", () => {
    const text = (source.excerpt + "\n").repeat(30) + "x".repeat(400);
    const spans = evidenceSpans(text);
    expect(spans.length).toBeGreaterThan(2);
    for (const quote of spans) {
      expect(text.includes(quote)).toBe(true);
      expect(quote.length).toBeGreaterThanOrEqual(12);
      expect(quote.length).toBeLessThanOrEqual(300);
      expect(quote.trim().split(/\s+/).length).toBeLessThanOrEqual(25);
    }
  });
  it("resolves IDs into original evidence and preserves discussion and source attribution", () => {
    const prepared = prepareEvidence([source]);
    const result = validateCitedDraft({posts: [post]}, prepared.evidenceById, [source], now);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.issues.join("; "));
    expect(result.value.posts[0].evidence[0]).toEqual({sourceId: "a", quote: source.excerpt});
    const item = enrichEditorial(result.value, [source], now, "run")[0];
    expect(item.editorial?.discussion).toHaveLength(2);
    expect(item.editorial?.sources[0].url).toBe(source.url);
  });
  it("rejects unknown IDs and discussion references to sources not cited by their post", () => {
    const other = {...source, id: "b", topic: "movies", url: "https://example.com/b"};
    const prepared = prepareEvidence([source, other]);
    for (const id of ["invented", "S2E1"]) {
      const draft = {posts: [{...post, discussion: [{...post.discussion[0], evidenceIds: [id]}, post.discussion[1]]}]};
      expect(validateCitedDraft(draft, prepared.evidenceById, [source, other], now).ok).toBe(false);
    }
  });
  it("retains stale-news, quote-provenance, and duplicate-coverage checks", () => {
    const stale = {...source, evergreen: true};
    const prepared = prepareEvidence([stale]);
    expect(validateCitedDraft({posts: [{...post, format: "news"}]}, prepared.evidenceById, [stale], now).ok).toBe(false);
    expect(validateCitedDraft({posts: [post, post]}, prepared.evidenceById, [source], now).ok).toBe(false);
    prepared.evidenceById.set("S1E1", {sourceId: "a", quote: "This was not in the source"});
    expect(validateCitedDraft({posts: [post]}, prepared.evidenceById, [source], now).ok).toBe(false);
  });
  it("bounds source and excerpt counts while retaining minority topics", () => {
    const packets = Array.from({length: 40}, (_, i) => ({...source, id: String(i), topic: i < 38 ? "science" : "movies", excerpt: source.excerpt.repeat(50)}));
    const prepared = prepareEvidence(packets);
    expect(prepared.sources).toHaveLength(16);
    expect(new Set(prepared.sources.map((s) => s.topic)).size).toBe(2);
    expect(prepared.evidenceById.size).toBeLessThanOrEqual(16 * 12);
    expect(prepareEvidence([]).sources).toEqual([]);
  });
});
