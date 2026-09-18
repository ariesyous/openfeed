import { describe, expect, it, vi } from "vitest";
import { articleExcerpt, collectEvergreen, EVERGREEN_SOURCES } from "../editorial/evergreen";

const prose = "Comets contain frozen gases, rock and dust. When they approach the Sun, heating releases material into a glowing cloud and a tail. This general introduction describes the class of objects; it does not identify the subject of a separate observation. An observation about one named comet cannot be silently reassigned to another named comet.";
const other = "A separate story describes a different object and a different observation. Its placement on the same landing page does not make it part of the introductory explanation, and its claims require the linked article's own evidence and context before they can be used.";

describe("coherent evergreen article extraction", () => {
  it("keeps NASA topic introductions without joining 41P and 3I landing-page modules", () => {
    // Layout reduced from NASA's Comets page, retrieved September 18, 2026.
    // Fixture prose is synthetic; no model or network is used by this test.
    const html = `<!doctype html><html><body><article class="topic type-topic"><div class="entry-content">
      <div class="wp-block-nasa-blocks-secondary-navigation"><p>${other}</p></div>
      <h2>Introduction</h2><p class="wp-block-paragraph">${prose}</p>
      <div class="wp-block-nasa-blocks-featured-story"><h2>41P spin reversal</h2><p>${other}</p></div>
      <div class="wp-block-nasa-blocks-card-grid"><h2>3I/ATLAS</h2><p>${other}</p></div>
      <div class="wp-block-nasa-blocks-featured-link"><p>Comet 3I/ATLAS ${other}</p></div>
      </div></article></body></html>`;
    expect(articleExcerpt(html)).toBe(prose);
    expect(articleExcerpt(html)).not.toMatch(/41P|3I\/ATLAS/);
  });

  it("keeps neighboring direct NASA paragraphs together across formatting whitespace", () => {
    const first = "The first direct paragraph gives a substantive introduction to the subject. It establishes enough information to begin the explanation but is too short to qualify as article prose alone.";
    const second = "The neighboring paragraph continues that same explanation with additional context. Formatting newlines between HTML elements should not separate these two pieces of connected article prose.";
    expect(first.length).toBeLessThan(300);
    expect(second.length).toBeLessThan(300);
    const html = `<article class="type-topic"><div class="entry-content">
      <h2>Introduction</h2>
      <p class="wp-block-paragraph">${first}</p>
      <p class="wp-block-paragraph">${second}</p>
      <div class="wp-block-nasa-blocks-featured-story"><p>${other}</p></div>
      </div></article>`;
    expect(articleExcerpt(html)).toBe(`${first}\n\n${second}`);
  });

  it("fails closed on hubs made entirely of linked modules but preserves ordinary NASA articles", () => {
    expect(articleExcerpt(`<article class="type-topic"><div class="entry-content"><div class="wp-block-nasa-blocks-featured-link"><p>${prose}</p></div></div></article>`)).toBe("");
    expect(articleExcerpt(`<article class="type-post"><div class="entry-content"><p>${prose}</p></div></article>`)).toBe(prose);
    expect(articleExcerpt(`<article><div class="story-card"><p>${prose}</p></div><div class="related-stories"><p>${other}</p></div></article>`)).toBe("");
  });

  it("preserves inline text and short factual qualifications, excluding nested articles and chrome", () => {
    const html = `<nav><p>${other}</p></nav><article><header><p>${other}</p></header>
      <p>${prose.replace("frozen gases", "<strong>frozen</strong> gases")}</p><p>Not always.</p>
      <aside><p>${other}</p></aside><article><p>${other}</p></article></article>`;
    expect(articleExcerpt(html)).toBe(`${prose}\n\nNot always.`);
  });

  it("selects a complete section instead of blending independent headings or truncated teasers", () => {
    expect(articleExcerpt(`<article><h2>First section</h2><p>${prose}</p><h2>Another subject</h2><p>${other}</p></article>`)).toBe(prose);
    expect(articleExcerpt(`<article><div class="teaser"><p>${other}</p></div><p>Scientists have discovered something about a comet, and the next steps will…</p></article>`)).toBe("");
    expect(articleExcerpt(`<div id="aueditable"><div id="main-text"><h2>A section</h2><p>${prose}</p></div><div id="bibliography"><p>${other}</p></div></div>`)).toBe(prose);
  });

  it("keeps complete paragraphs within 6,000 characters and rejects dangerous declarations", () => {
    const long = prose.repeat(8);
    const result = articleExcerpt(`<article><p>${long}</p><p>${long}</p><p>${long}</p></article>`);
    expect(result).toBe(`${long}\n\n${long}`);
    expect(result.length).toBeLessThanOrEqual(6000);
    expect(articleExcerpt(`<!DOCTYPE html [<!ENTITY x SYSTEM "file:///etc/passwd">]><article><p>${prose}</p></article>`)).toBe("");
    expect(articleExcerpt(`<article><p>${"a".repeat(1_000_001)}</p></article>`)).toBe("");
  });

  it("preserves fixed-URL, timeout, size and unknown-publication-date intake safeguards", async () => {
    const selected = EVERGREEN_SOURCES.find(source => source.title === "Comets")!;
    const covered = new Set(EVERGREEN_SOURCES.filter(source => source !== selected).map(source => source.url));
    const fetchImpl = vi.fn(async (_url: string | URL | Request, options?: RequestInit) => {
      expect(options?.redirect).toBe("error");
      expect(options?.signal).toBeInstanceOf(AbortSignal);
      return new Response(`<article><p>${prose}</p></article>`);
    });
    const packets = await collectEvergreen(new Date("2026-09-18T00:00:00Z"), fetchImpl as typeof fetch, covered);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0][0]).toBe(selected.url);
    expect(packets).toHaveLength(1);
    expect(packets[0].evergreen).toBe(true);
    expect(packets[0].publishedAt).toBeUndefined();
    expect(await collectEvergreen(new Date(), vi.fn(async () => new Response("a".repeat(1_000_001))) as typeof fetch, covered)).toEqual([]);
  });
});
