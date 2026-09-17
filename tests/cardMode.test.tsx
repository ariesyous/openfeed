import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { App } from "../src/App";
import { SwipeCard } from "../src/components/SwipeCard";
import { CardView } from "../src/components/CardView";
import { useCardDeck } from "../src/hooks/useCardDeck";
import { CARD_HISTORY_KEY, persistSeenCards, readSeenCards, selectCard } from "../src/lib/cardSelection";
import type { FeedItem } from "../schemas";
const manifest = JSON.parse(readFileSync("public/data/manifest.json", "utf8"));
const batch = JSON.parse(readFileSync(`public/data/${manifest.batches[0].file}`, "utf8"));
const accounts = JSON.parse(readFileSync("public/data/accounts.json", "utf8"));
const post = (id: string, community = "science"): FeedItem => ({ ...batch.items[0], id, slug: undefined, title: `Article ${id}`, body: `The original body of ${id}.`, community, editorial: { ...batch.items[0].editorial, spoilers: false } });
const a = post("a"), b = post("b", "movies"), c = post("c");
function mockFeed(editions: FeedItem[][]) {
  const refs = editions.map((items, i) => ({ id: `edition-${i}`, file: `batches/edition-${i}.json`, itemCount: items.length, generatedAt: new Date(Date.UTC(2026, 8, 17, 10 - i)).toISOString() }));
  return vi.fn(async (url: string) => ({ ok: true, json: async () => {
    if (url.includes("manifest.json")) return { ...manifest, batches: refs };
    if (url.endsWith("accounts.json")) return accounts;
    const index = refs.findIndex(ref => url.endsWith(ref.file));
    if (index < 0) throw Error(`Unexpected URL ${url}`);
    return { ...batch, batchId: refs[index].id, items: editions[index] };
  } }));
}
beforeEach(() => {
  localStorage.clear(); window.history.replaceState({}, "", "/");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(900);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(360);
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(320);
  vi.stubGlobal("fetch", mockFeed([[a, b, c]]));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("card selection and history", () => {
  it("selects unseen content, varies topics, and keeps Different topic strict", () => {
    expect(selectCard([a, c, b], new Set([a.id]), a, "next")).toBe(b);
    expect(selectCard([a, c], new Set([a.id]), a, "different")).toBeUndefined();
    expect(selectCard([a, c], new Set([a.id]), a, "next")).toBe(c);
    expect(selectCard([a, b], new Set([a.id, b.id]), a, "next")).toBeUndefined();
  });
  it("records presentation, not fetched or selected cards, and persists across visits", async () => {
    const first = renderHook(() => useCardDeck(true));
    await waitFor(() => expect(first.result.current.current?.id).toBe(a.id));
    expect(readSeenCards().size).toBe(0);
    act(() => first.result.current.presented(a));
    expect([...readSeenCards()]).toEqual([a.id]);
    first.unmount();
    const second = renderHook(() => useCardDeck(true));
    await waitFor(() => expect(second.result.current.current?.id).toBe(b.id));
    expect(readSeenCards().has(c.id)).toBe(false);
  });
  it("recovers corrupt storage and keeps working when writes are unavailable", async () => {
    localStorage.setItem(CARD_HISTORY_KEY, "broken");
    const view = renderHook(() => useCardDeck(true));
    await waitFor(() => expect(view.result.current.current?.id).toBe(a.id));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("disabled"); });
    act(() => view.result.current.presented(a));
    expect(view.result.current.storageNotice).toContain("this visit only");
    act(() => view.result.current.advance("next"));
    await waitFor(() => expect(view.result.current.current?.id).toBe(b.id));
  });
  it("bounds automatic archive searches, offers continuation, and never declares premature exhaustion", async () => {
    const items = [a, b, c, post("d"), post("e")];
    persistSeenCards(new Set(items.slice(0, 4).map(item => item.id)));
    const fetcher = mockFeed(items.map(item => [item])); vi.stubGlobal("fetch", fetcher);
    const view = renderHook(() => useCardDeck(true));
    await waitFor(() => expect(view.result.current.status).toBe("continue"));
    expect(fetcher.mock.calls.filter(([url]) => url.includes("batches/"))).toHaveLength(4);
    expect(view.result.current.current).toBeNull();
    act(() => view.result.current.continueSearch());
    await waitFor(() => expect(view.result.current.current?.id).toBe("e"));
  });
  it("does not silently repeat or change topic when no unseen alternative exists", async () => {
    vi.stubGlobal("fetch", mockFeed([[a, c]]));
    const view = renderHook(() => useCardDeck(true));
    await waitFor(() => expect(view.result.current.current?.id).toBe(a.id));
    act(() => { view.result.current.presented(a); view.result.current.advance("different"); });
    await waitFor(() => expect(view.result.current.status).toBe("no-alternative"));
    expect(view.result.current.current?.id).toBe(a.id);
    act(() => view.result.current.advance("next"));
    await waitFor(() => expect(view.result.current.current?.id).toBe(c.id));
    act(() => { view.result.current.presented(c); view.result.current.advance("next"); });
    await waitFor(() => expect(view.result.current.status).toBe("exhausted"));
    act(() => view.result.current.revisit());
    await waitFor(() => expect(view.result.current.current?.id).toBe(a.id));
    expect(view.result.current.revisiting).toBe(true);
  });
  it("loads a new edition only on request without displacing the current card", async () => {
    const fresh = post("fresh", "philosophy");
    const original = mockFeed([[a, b]]);
    let newEdition = false;
    let poll: (() => Promise<void>) | undefined;
    const originalInterval = globalThis.setInterval;
    vi.stubGlobal("setInterval", (callback: () => Promise<void>, delay: number) => { if (delay === 300_000) poll = callback; return originalInterval(callback, delay); });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("batches/fresh.json")) return { ok: true, json: async () => ({ ...batch, items: [fresh] }) };
      const response = await original(url);
      if (!newEdition || !url.includes("manifest.json")) return response;
      return { ok: true, json: async () => {
        const data = await response.json();
        return { ...data, batches: [{ id: "fresh", file: "batches/fresh.json", generatedAt: "2026-09-17T12:00:00Z", itemCount: 1 }, ...data.batches] };
      } };
    }));
    const view = renderHook(() => useCardDeck(true));
    await waitFor(() => expect(view.result.current.current?.id).toBe(a.id));
    act(() => view.result.current.presented(a));
    newEdition = true;
    await act(async () => { await poll!(); });
    expect(view.result.current.newPostCount).toBe(1);
    expect(view.result.current.current?.id).toBe(a.id);
    await act(async () => { await view.result.current.showNewPosts(); });
    expect(view.result.current.current?.id).toBe(a.id);
    expect(readSeenCards().has(fresh.id)).toBe(false);
    act(() => view.result.current.advance("next"));
    await waitFor(() => expect(view.result.current.current?.id).toBe(fresh.id));
  });
  it("pauses hidden-card selection and lets an older-batch failure retry", async () => {
    const fetcher = mockFeed([[a], [b]]); let fail = true;
    vi.stubGlobal("fetch", vi.fn((url: string) => url.includes("edition-1") && fail ? Promise.resolve({ ok: false }) : fetcher(url)));
    const view = renderHook(({ active }) => useCardDeck(active), { initialProps: { active: false } });
    await waitFor(() => expect(fetcher.mock.calls.some(([url]) => url.includes("edition-0"))).toBe(true));
    expect(view.result.current.current).toBeNull();
    view.rerender({ active: true });
    await waitFor(() => expect(view.result.current.current?.id).toBe(a.id));
    act(() => { view.result.current.presented(a); view.result.current.advance("different"); });
    await waitFor(() => expect(view.result.current.error).toBeTruthy());
    expect(view.result.current.current?.id).toBe(a.id);
    fail = false;
    act(() => view.result.current.retry());
    await waitFor(() => expect(view.result.current.current?.id).toBe(b.id));
  });
});

describe("card UI", () => {
  const props = () => ({ item: a, active: true, disabled: false, onAdvance: vi.fn(), onOpenArticle: vi.fn(), onOpenTopic: vi.fn(), onPresented: vi.fn() });
  it("keeps the original copy, sources and spoiler protection", () => {
    const item = { ...a, body: "EXACT ORIGINAL SPOILER BODY", editorial: { ...a.editorial!, spoilers: true } };
    const callbacks = props(); render(<SwipeCard {...callbacks} item={item} />);
    expect(screen.queryByText(item.body)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show spoilers" }));
    expect(screen.getByText(item.body)).toBeVisible();
    expect(screen.getByRole("link", { name: new RegExp(item.editorial.sources[0].publisher) })).toHaveAttribute("href", item.editorial.sources[0].url);
  });
  it("does not mark cards seen in a background tab", () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const callbacks = props(); render(<SwipeCard {...callbacks} />);
    expect(callbacks.onPresented).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    expect(callbacks.onPresented).toHaveBeenCalledWith(a);
  });
  it("reports insufficient space rather than displaying clipped copy or marking it seen", () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
    const callbacks = props(); render(<SwipeCard {...callbacks} />);
    expect(screen.getByText("This post needs more room at this screen size.")).toBeVisible();
    expect(screen.getByText(a.body)).not.toBeVisible();
    expect(callbacks.onPresented).not.toHaveBeenCalled();
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(900);
    fireEvent(window, new Event("resize"));
    expect(screen.getByText(a.body)).toBeVisible();
    expect(callbacks.onPresented).toHaveBeenCalledWith(a);
  });
  it("handles horizontal swipes but ignores cancelled, vertical, short and interactive drags", () => {
    class TestPointer extends MouseEvent {
      pointerId: number; pointerType: string; isPrimary: boolean;
      constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.pointerType = init.pointerType ?? "touch"; this.isPrimary = init.isPrimary ?? true; }
    }
    vi.stubGlobal("PointerEvent", TestPointer);
    const callbacks = props(); render(<SwipeCard {...callbacks} />);
    const card = screen.getByRole("article");
    const down = (target = card) => fireEvent.pointerDown(target, { clientX: 200, clientY: 100, pointerId: 1, button: 0 });
    down(); fireEvent.pointerMove(card, { clientX: 80, clientY: 105, pointerId: 1 }); fireEvent.pointerUp(card, { clientX: 80, clientY: 105, pointerId: 1 });
    expect(callbacks.onAdvance).toHaveBeenCalledWith("different"); callbacks.onAdvance.mockClear();
    down(); fireEvent.pointerMove(card, { clientX: 205, clientY: 230, pointerId: 1 }); fireEvent.pointerUp(card, { clientX: 205, clientY: 230, pointerId: 1 });
    down(); fireEvent.pointerMove(card, { clientX: 220, clientY: 100, pointerId: 1 }); fireEvent.pointerUp(card, { clientX: 220, clientY: 100, pointerId: 1 });
    down(); fireEvent.pointerMove(card, { clientX: 330, clientY: 100, pointerId: 1 }); fireEvent.pointerCancel(card);
    down(screen.getByRole("link", { name: a.title })); fireEvent.pointerMove(card, { clientX: 330, clientY: 100, pointerId: 1 }); fireEvent.pointerUp(card, { clientX: 330, clientY: 100, pointerId: 1 });
    expect(callbacks.onAdvance).not.toHaveBeenCalled();
    down(); fireEvent.pointerMove(card, { clientX: 330, clientY: 100, pointerId: 1 }); fireEvent.pointerUp(card, { clientX: 330, clientY: 100, pointerId: 1 });
    expect(callbacks.onAdvance).toHaveBeenCalledWith("next");
  });
  it("supports buttons, keyboard, undo and ignores keys while hidden", async () => {
    const view = render(<CardView active onOpenArticle={vi.fn()} onOpenTopic={vi.fn()} onExit={vi.fn()} />);
    await screen.findByRole("heading", { name: a.title });
    fireEvent.click(screen.getByRole("button", { name: "← Different topic" }));
    await screen.findByRole("heading", { name: b.title });
    fireEvent.keyDown(window, { key: "z" });
    await screen.findByRole("heading", { name: a.title });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await screen.findByRole("heading", { name: c.title });
    view.rerender(<CardView active={false} onOpenArticle={vi.fn()} onOpenTopic={vi.fn()} onExit={vi.fn()} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: c.title })).toBeInTheDocument();
  });
  it("restores the active card from an article and preserves the feed when switching modes", async () => {
    render(<App />);
    await screen.findByRole("link", { name: a.title });
    fireEvent.click(screen.getByRole("button", { name: "Cards" }));
    expect(window.location.search).toBe("?view=cards");
    const cards = await screen.findByRole("region", { name: "Card mode — all topics" });
    await within(cards).findByRole("link", { name: a.title });
    fireEvent.click(within(cards).getByRole("link", { name: a.title }));
    const article = await screen.findByRole("region", { name: "Article" });
    expect(within(article).getByRole("link", { name: "← Back to cards" })).toHaveAttribute("href", "/?view=cards");
    await act(async () => { window.history.back(); });
    await waitFor(() => expect(window.location.search).toBe("?view=cards"));
    expect(await screen.findByRole("heading", { name: a.title })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Feed" }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Cards" }));
    expect(screen.getByRole("heading", { name: a.title })).toBeVisible();
  });
});
