import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { collectEvergreen, EVERGREEN_SOURCES, isRetired, shelfExcerpt } from "../editorial/evergreen";
import { prepareEvidence } from "../editorial/evidence";
import { validateCitedDraft } from "../editorial/generate";
import { coverageTitle } from "../editorial/coverage";
import review from "../../docs/fixtures/source-supply-review-20261023.json";

const additions = review.sources.filter(row => row.decision === "add");
const now = new Date("2026-10-23T06:00:00Z");
const sourceId = (url: string) => createHash("sha256").update(url).digest("hex").slice(0, 16);

describe("October 23 shelf refill for mythology, film, Sopranos, science and economics", () => {
  it("adds every reviewed page once, with topics matching the ledger", () => {
    expect(additions).toHaveLength(72);
    const counts = additions.reduce<Record<string, number>>((all, row) => ({ ...all, [row.topic]: (all[row.topic] ?? 0) + 1 }), {});
    expect(counts).toEqual({ greek_roman_mythology: 11, movies: 28, the_sopranos: 6, science: 10, economics: 16, philosophy: 1 });
    for (const row of additions) {
      const shelf = EVERGREEN_SOURCES.filter(source => source.url === row.url);
      expect(shelf).toHaveLength(1);
      expect(shelf[0]).toMatchObject({ topic: row.topic, publisher: row.publisher, title: row.title });
      expect(isRetired(shelf[0])).toBe(false);
    }
    for (const row of review.sources.filter(row => row.decision === "exclude"))
      expect(EVERGREEN_SOURCES.some(source => source.url === row.url)).toBe(false);
    // New titles are distinct from every shelf page, so normalized-title coverage of one
    // page never hides another. (Two older pages share a subject title, e.g. Socrates.)
    const titles = EVERGREEN_SOURCES.map(source => coverageTitle(source.title));
    for (const row of additions) expect(titles.filter(title => title === coverageTitle(row.title!))).toHaveLength(1);
  });

  it.each(additions)("retains reviewed support and complete groups: $title", row => {
    const excerpt = shelfExcerpt(row.offlineHtml!, row.publisher);
    expect(excerpt).toBe(row.offlineExcerpt);
    expect(excerpt).not.toContain("EXCLUDED");
    const packet = { topic: row.topic, publisher: row.publisher, title: row.title!, url: row.url, id: sourceId(row.url), excerpt, evergreen: true, retrievedAt: now.toISOString() };
    const prepared = prepareEvidence([packet]);
    // Every offered snippet, not only the selected ones, survives the reduced capture.
    expect(prepared.sources[0].evidence).toEqual(expect.arrayContaining(row.offeredEvidence!));
    expect(row.selectedIds!.length).toBeLessThanOrEqual(3);
    for (const id of row.selectedIds!) {
      const live = row.offeredEvidence!.find(entry => entry.id === id)!;
      for (const part of row.offeredEvidence!.filter(entry => entry.contextGroup === live.contextGroup))
        expect(row.selectedIds).toContain(part.id);
    }
    const draft = { posts: [{ format: "explainer", title: row.supportedAngle, body: row.reviewedProbe,
      topic: row.topic, evidenceIds: row.selectedIds, discussion: null, spoilers: row.spoilers }] };
    const result = validateCitedDraft(draft, prepared.evidenceById, [packet], now);
    expect(result.ok).toBe(true); // Provenance only; probes are manually reviewed, never published.
    if (result.ok) expect(result.value.posts[0].spoilers).toBe(row.spoilers);
  });

  it("matched the reviewed evidence through the live normal intake", () => {
    expect(review.normalIntakeRecheck).toHaveLength(72);
    for (const check of review.normalIntakeRecheck) {
      expect(check.exactOfferedEvidenceMatch).toBe(true);
      expect(check.unknownPublicationDate).toBe(true);
    }
  });

  it("fetches only unconsumed, unretired additions with unchanged bounds and unknown dates", async () => {
    const covered = new Set(EVERGREEN_SOURCES.filter(s => !additions.some(a => a.url === s.url)).map(s => s.url));
    for (const retired of EVERGREEN_SOURCES.filter(isRetired)) covered.delete(retired.url);
    const requested: string[] = [];
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input); requested.push(url);
      expect(init?.redirect).toBe("error");
      expect(init?.headers).toEqual({ Accept: "text/html" });
      const row = additions.find(a => a.url === url);
      if (!row) throw new Error("Unexpected source request");
      return new Response(row.offlineHtml, { status: 200 });
    }) as typeof fetch;
    const packets = await collectEvergreen(now, fetcher, covered);
    expect(packets).toHaveLength(additions.length);
    for (const packet of packets) {
      expect(packet.id).toBe(sourceId(packet.url));
      expect(packet.publishedAt).toBeUndefined();
      expect(packet.evergreen).toBe(true);
    }
    expect(requested.sort()).toEqual(additions.map(a => a.url).sort());
  });
});
