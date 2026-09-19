import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { articleExcerpt, collectEvergreen, EVERGREEN_SOURCES } from "../editorial/evergreen";
import { prepareEvidence } from "../editorial/evidence";
import { validateCitedDraft } from "../editorial/generate";
import review from "../../docs/fixtures/movie-sopranos-source-review-20260919.json";

const additions = review.sources.filter(row => row.decision === "add");
const now = new Date("2026-09-19T04:00:00Z");
const sourceId = (url: string) => createHash("sha256").update(url).digest("hex").slice(0, 16);

describe("reviewed movie and Sopranos packets", () => {
  it.each(additions)("retains live-selected support and complete groups: $title", row => {
    const excerpt = articleExcerpt(row.offlineHtml!);
    expect(excerpt).toBe(row.offlineExcerpt);
    expect(excerpt.length).toBeGreaterThanOrEqual(300);
    const packet = { ...row, id: sourceId(row.url), excerpt, evergreen: true, retrievedAt: now.toISOString() };
    const prepared = prepareEvidence([packet]);
    const offered = prepared.sources[0].evidence;
    expect(offered.length).toBeLessThanOrEqual(12);
    expect(row.selectedIds!.length).toBeLessThanOrEqual(3);
    for (const id of row.selectedIds!) {
      const live = row.offeredEvidence!.find(entry => entry.id === id)!;
      expect(offered.find(entry => entry.id === id)).toEqual(live);
      for (const part of row.offeredEvidence!.filter(entry => entry.contextGroup === live.contextGroup))
        expect(row.selectedIds).toContain(part.id);
    }
    const draft = { posts: [{ format: "explainer", title: row.supportedAngle,
      body: row.reviewedProbe, topic: row.topic, evidenceIds: row.selectedIds,
      discussion: null, spoilers: row.spoilers }] };
    const result = validateCitedDraft(draft, prepared.evidenceById, [packet], now);
    expect(result.ok).toBe(true); // Provenance only; probes are manually reviewed, never published.
    if (result.ok) expect(result.value.posts[0].spoilers).toBe(row.spoilers);
  });

  it("fetches only unconsumed additions with unchanged bounds, IDs and unknown dates", async () => {
    const covered = new Set(EVERGREEN_SOURCES.filter(s => !additions.some(a => a.url === s.url)).map(s => s.url));
    const requested: string[] = [];
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input); requested.push(url);
      expect(init?.redirect).toBe("error");
      expect(init?.headers).toEqual({ Accept: "text/html" });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const row = additions.find(a => a.url === url);
      if (!row) throw new Error("Unexpected source request");
      return new Response(row.offlineHtml, { status: 200 });
    }) as typeof fetch;
    const packets = await collectEvergreen(now, fetcher, covered);
    expect(packets).toHaveLength(additions.length);
    for (const packet of packets) {
      expect(packet.id).toBe(sourceId(packet.url));
      expect(packet.publishedAt).toBeUndefined();
      expect(packet.retrievedAt).toBe(now.toISOString());
      expect(packet.evergreen).toBe(true);
      covered.add(packet.url);
    }
    expect(await collectEvergreen(now, fetcher, covered)).toEqual([]);
    expect(requested).toHaveLength(additions.length);
  });
});

describe("American Cinematographer single-story layout", () => {
  const source = additions.find(row => row.publisher === "American Cinematographer")!;
  const html = source.offlineHtml!;
  it("selects the marked body, excluding captions, later sections and recommendation articles", () => {
    expect(articleExcerpt(html)).toBe(source.offlineExcerpt);
    expect(articleExcerpt(html)).not.toContain("sentinel");
  });
  it("fails closed when the recognized single-story layout loses its body marker", () => {
    const changed = html.replace('data-widget_type="theme-post-content.default"', 'data-widget_type="unknown"')
      .replace("RECOMMENDATION sentinel must not enter the packet.", "Unrelated recommendation prose. ".repeat(20));
    expect(articleExcerpt(changed)).toBe("");
  });
  it("does not promote a generic content div without the single-story markers", () => {
    const changed = html.replace('data-elementor-type="single-post"', 'data-elementor-type="archive"')
      .replace(/<article[\s\S]*?<\/article>/, "");
    expect(articleExcerpt(changed)).toBe("");
  });
});
