import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedList } from "../src/components/FeedList";
import { useFeed } from "../src/hooks/useFeed";
import { readFileSync } from "node:fs";
import type { BatchFile, Manifest } from "../schemas";
const read = (file: string) =>
  JSON.parse(readFileSync(`public/data/${file}`, "utf8"));
const sourceManifest = read("manifest.json") as Manifest;
const source = read(sourceManifest.batches[0].file) as BatchFile;
const accounts = read("accounts.json");
const ref = (id: string, generatedAt: string) => ({
  id,
  generatedAt,
  file: `batches/${id}.json`,
  itemCount: 1,
});
const first = ref("first", "2026-09-15T12:00:00.000Z");
const older = ref("older", "2026-09-14T12:00:00.000Z");
const fresh = ref("fresh", "2026-09-16T12:00:00.000Z");
function mockFeed() {
  let refs = [first, older];
  let fail = false;
  const fetcher = vi.fn(async (url: string) => {
    if (url.includes("manifest.json"))
      return {
        ok: true,
        json: async () => ({ ...sourceManifest, batches: refs }),
      };
    if (url.endsWith("accounts.json"))
      return { ok: true, json: async () => accounts };
    if (url.includes("older") && fail) throw new Error("offline");
    const id = url.includes("older")
      ? "older"
      : url.includes("fresh")
        ? "fresh"
        : "first";
    return {
      ok: true,
      json: async () => ({
        ...source,
        batchId: id,
        items: [{ ...source.items[0], id }],
      }),
    };
  });
  vi.stubGlobal("fetch", fetcher);
  return {
    fetcher,
    failOlder: () => {
      fail = true;
    },
    recover: () => {
      fail = false;
    },
    publish: () => {
      refs = [fresh, first, older];
    },
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
describe("feed loading", () => {
  it("lets readers explore profiles, filter communities, and expand discussions", async () => {
    mockFeed();
    render(<FeedList />);
    await screen.findByRole("heading", {
      name: "Your window into another internet.",
    });
    const author = accounts.find(
      (a: { id: string }) => a.id === source.items[0].authorId,
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: author.displayName })[0],
    );
    expect(
      screen.getByRole("region", { name: `${author.displayName}'s profile` }),
    ).toBeInTheDocument();
    expect(screen.getByText(author.bio)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "← Back to feed" }));
    fireEvent.change(screen.getByLabelText("Explore a community"), {
      target: { value: source.items[0].community },
    });
    const discussion = screen.getAllByRole("button", {
      name: /View discussion/,
    })[0];
    fireEvent.click(discussion);
    expect(
      screen.getByRole("button", { name: "Hide discussion" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("retains a failed older batch and retries without losing or duplicating posts", async () => {
    const mock = mockFeed();
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.isLoadingInitial).toBe(false));
    mock.failOlder();
    await act(() => result.current.loadMore());
    expect(result.current.hasMore).toBe(true);
    expect(result.current.error).toBeTruthy();
    mock.recover();
    await act(() => result.current.loadMore());
    expect(result.current.items.map((i) => i.id)).toEqual(["first", "older"]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
  });
  it("prevents concurrent requests for the same older batch", async () => {
    const mock = mockFeed();
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.isLoadingInitial).toBe(false));
    await act(async () => {
      await Promise.all([result.current.loadMore(), result.current.loadMore()]);
    });
    expect(
      mock.fetcher.mock.calls.filter(([url]) => url.includes("older")),
    ).toHaveLength(1);
  });
  it("announces new batches without changing the feed until the reader opts in", async () => {
    const mock = mockFeed();
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.isLoadingInitial).toBe(false));
    // Capture the refresh callback without advancing browser time or real network calls.
    vi.useFakeTimers();
    const refresh = vi.spyOn(globalThis, "setInterval");
    const second = renderHook(() => useFeed());
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const callback = refresh.mock.calls[0][0] as () => Promise<void>;
    mock.publish();
    await act(async () => {
      await callback();
    });
    expect(second.result.current.newPostCount).toBe(1);
    expect(second.result.current.items.map((i) => i.id)).toEqual(["first"]);
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    await act(() => second.result.current.showNewPosts());
    expect(second.result.current.items.map((i) => i.id)).toEqual([
      "fresh",
      "first",
    ]);
    expect(second.result.current.newPostCount).toBe(0);
  });
});
