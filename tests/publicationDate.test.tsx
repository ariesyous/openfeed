import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { FeedItem } from "../schemas";
import { publicationDate } from "../shared/publicationDate";
import { PublicationDate } from "../src/components/PublicationDate";
import { PostCard } from "../src/components/PostCard";
import { SwipeCard } from "../src/components/SwipeCard";
import { cardSamples } from "./browser/cardSamples";

const now = new Date("2026-09-18T23:00:00Z");
const manifest = JSON.parse(readFileSync("public/data/manifest.json", "utf8"));
const items: FeedItem[] = manifest.batches.flatMap((batch: { file: string }) => JSON.parse(readFileSync(`public/data/${batch.file}`, "utf8")).items);
const find = (id: string) => items.find(item => item.id === id)!;
const recent = find("post-20260918T182557Z-8bc1-0");
const old = find("post-20260918T044314Z-6f06-14");
const unknown = find("post-20260918T182557Z-8bc1-2");
const multiple = find("post-20260917T225126Z-4ac8-14");
const props = { active: true, disabled: false, onAdvance: vi.fn(), onOpenArticle: vi.fn(), onOpenTopic: vi.fn(), onPresented: vi.fn() };
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("publication date semantics", () => {
  it.each([
    ["2026-09-18T16:02:31.000Z", "Sep 18, 2026"],
    ["2025-08-24T19:40:16.000Z", "Aug 24, 2025"],
    ["2024-02-29T00:00:00Z", "Feb 29, 2024"],
    ["2026-09-18T00:01:00Z", "Sep 18, 2026"],
    [now.toISOString(), "Sep 18, 2026"],
  ])("keeps an absolute UTC date and year for %s", (iso, label) => {
    expect(publicationDate(iso, now)).toEqual({ status: "dated", dateTime: iso, label });
    expect(publicationDate(iso, new Date("2030-01-01T00:00:00Z"))).toEqual({ status: "dated", dateTime: iso, label });
  });
  it.each(["", "no date", "2026-02-30T00:00:00Z", "2025-02-29T00:00:00Z", "2026-13-01T00:00:00Z", "2026-09-18T24:00:00Z", "2026-09-18", "09/18/2026"])("rejects invalid or non-contract timestamps: %s", iso => {
    expect(publicationDate(iso, now)).toEqual({ status: "invalid" });
  });
  it("distinguishes unknown and future metadata without inventing a date", () => {
    expect(publicationDate(undefined, now)).toEqual({ status: "missing" });
    expect(publicationDate("2026-09-18T23:00:01Z", now)).toEqual({ status: "future" });
  });
  it.each([undefined, "broken", "2999-01-01T00:00:00Z"])("does not output a misleading time element for %s", iso => {
    const { container } = render(<PublicationDate iso={iso} />);
    expect(screen.getByText("Publication date unavailable")).toBeVisible();
    expect(container.querySelector("time")).toBeNull();
  });
});

describe("temporal context on existing articles", () => {
  it.each(cardSamples)("keeps the full historical sample $label available without rewriting", sample => {
    const item = find(sample.id);
    expect(item).toBeDefined();
    const view = render(<SwipeCard {...props} item={item} />);
    expect(view.container.querySelector("h1")!.textContent).toBe(item.title);
    if (item.editorial?.spoilers) fireEvent.click(view.container.querySelector(".card-spoilers")!);
    expect(view.container.querySelector(".swipe-card-copy p")!.textContent).toBe(item.body);
    for (const source of item.editorial!.sources) {
      expect(screen.getByRole("link", { name: `${source.publisher}: ${source.title}` })).toHaveAttribute("href", source.url);
    }
  });
  it.each([recent, old, unknown, multiple])("preserves dates and source identity for $id in Cards and feed", item => {
    const view = render(<SwipeCard {...props} item={item} />);
    // No mocked pixel geometry here: jsdom must show the explicit full-article
    // fallback, while the source dates stay accessible. This is not a fit test.
    const sources = view.container.querySelector(".card-sources")!;
    for (const source of item.editorial!.sources) {
      const link = within(sources as HTMLElement).getByRole("link", { name: `${source.publisher}: ${source.title}` });
      expect(link).toHaveAttribute("href", source.url);
      if (source.publishedAt) {
        expect(link.parentElement!.querySelector("time")).toHaveAttribute("datetime", source.publishedAt);
        const date = publicationDate(source.publishedAt, now);
        expect(date.status).toBe("dated");
        if (date.status === "dated") expect(link.parentElement).toHaveTextContent(`Published ${date.label}`);
      } else expect(link.parentElement).toHaveTextContent("Publication date unavailable");
    }
    expect(view.container.querySelector(".swipe-card-copy h1")).toHaveTextContent(item.title!);
    expect(view.container.querySelector(".swipe-card-copy p")!.textContent).toBe(item.body);
    view.unmount();
    const feed = render(<PostCard item={item} accountsById={new Map()} />);
    expect(feed.container.querySelector(".post-card-time time")).toHaveAttribute("datetime", item.createdAt);
    expect(feed.container.querySelector(".post-card-time")).toHaveTextContent("Added Sep");
    expect(feed.container.querySelectorAll(".source-panel time")).toHaveLength(item.editorial!.sources.filter(source => source.publishedAt).length);
    expect(screen.queryByText(/Background reading|evergreen/)).not.toBeInTheDocument();
  });
  it("shows each source's own date when dates differ or one is unknown", () => {
    // In-memory variants only: stored multiple-source article happens to have
    // two timestamps on the same day. No public content is rewritten.
    const item = structuredClone(multiple);
    item.editorial!.sources[1].publishedAt = old.editorial!.sources[0].publishedAt;
    const view = render(<SwipeCard {...props} item={item} />);
    expect(screen.getByText("Published Sep 17, 2026")).toBeVisible();
    expect(screen.getByText("Published Aug 24, 2025")).toBeVisible();
    const mixed = structuredClone(item);
    delete mixed.editorial!.sources[1].publishedAt;
    view.rerender(<SwipeCard {...props} item={mixed} />);
    expect(screen.getByText("Published Sep 17, 2026")).toBeVisible();
    expect(screen.getByText("Publication date unavailable")).toBeVisible();
    expect(screen.queryByText(/Aug 24/)).not.toBeInTheDocument();
  });
  it("keeps dates visible behind the spoiler gate and leaves original paragraphs intact", () => {
    const item = find("post-editorial-launch-20260915-4");
    const gated = { ...item, editorial: { ...item.editorial!, spoilers: true } };
    const view = render(<SwipeCard {...props} item={gated} />);
    expect(screen.getByText("Published Sep 13, 2026")).toBeVisible();
    expect(view.container.querySelector(".swipe-card-copy p")).toBeNull();
    // The gate is hidden in jsdom's zero-sized reading area; exercise its handler
    // directly. Native layout and spoiler-gate fit still need rendered checks.
    fireEvent.click(view.container.querySelector(".card-spoilers")!);
    expect(view.container.querySelector(".swipe-card-copy p")!.textContent).toBe(item.body);
  });
});
