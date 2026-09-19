import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { articleExcerpt, collectEvergreen, EVERGREEN_SOURCES } from "../editorial/evergreen";
import { prepareEvidence } from "../editorial/evidence";
import { validateCitedDraft } from "../editorial/generate";
import review from "../../docs/fixtures/culture-source-review-20260919.json";

const now = new Date("2026-09-19T02:39:19Z");
const additions = review.sources.filter(row => row.decision === "add");
describe("reviewed culture and ideas packets", () => {
  it.each(additions)("retains complete support within three IDs: $title", row => {
    const excerpt = articleExcerpt(row.offlineHtml!);
    expect(excerpt).toBe(row.offlineExcerpt);
    expect(excerpt.length).toBeGreaterThanOrEqual(300);
    const source = { ...row, id: createHash("sha256").update(row.url).digest("hex").slice(0, 16),
      excerpt, evergreen: true, retrievedAt: now.toISOString() };
    const prepared = prepareEvidence([source]);
    const offered = prepared.sources[0].evidence;
    const ids = row.support!.map(entry => entry.id);
    expect(ids.length).toBeLessThanOrEqual(3);
    for (const expected of row.support!) {
      expect(offered.find(entry => entry.id === expected.id)).toEqual(expected);
      // Selecting a split sentence without its qualification cannot pass this fixture review.
      for (const part of offered.filter(entry => entry.contextGroup === expected.contextGroup))
        expect(ids).toContain(part.id);
    }
    const result = validateCitedDraft({ posts: [{ format: "explainer", title: row.supportedAngle,
      body: row.reviewedExample, evidenceIds: ids, discussion: null, topic: row.topic, spoilers: null }] },
    prepared.evidenceById, [source], now);
    expect(result.ok).toBe(true); // Provenance only; payoff is a documented human judgment.
  });

  it("uses the normal intake and never refetches consumed additions", async () => {
    const covered = new Set(EVERGREEN_SOURCES.filter(s => !additions.some(a => a.url === s.url)).map(s => s.url));
    const requested: string[] = [];
    const fetcher = (async (input: string | URL | Request) => {
      const url = String(input); requested.push(url);
      const row = additions.find(a => a.url === url);
      if (!row) throw new Error("Unexpected source request");
      return new Response(row.offlineHtml, { status: 200 });
    }) as typeof fetch;
    const packets = await collectEvergreen(now, fetcher, covered);
    expect(packets).toHaveLength(4);
    for (const packet of packets) {
      expect(packet.publishedAt).toBeUndefined();
      expect(packet.evergreen).toBe(true);
      expect(packet.id).toBe(createHash("sha256").update(packet.url).digest("hex").slice(0, 16));
      covered.add(packet.url);
    }
    expect(await collectEvergreen(now, fetcher, covered)).toEqual([]);
    expect(requested).toHaveLength(4);
  });
});
