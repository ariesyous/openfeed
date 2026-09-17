import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedList } from "../src/components/FeedList";
import { useFeed } from "../src/hooks/useFeed";
import { readFileSync } from "node:fs";
import type { BatchFile, Manifest } from "../schemas";
const read = (file: string) =>
  JSON.parse(readFileSync(`public/data/${file}`, "utf8"));
const sourceManifest = read("manifest.json") as Manifest;
const actual = read(sourceManifest.batches[0].file) as BatchFile;
// The behaviour fixture must not depend on whichever news story was last published.
const fixtureItem = {
  ...actual.items[0],
  editorial: undefined,
  comments: [
    {
      id: "test-comment",
      authorId: actual.items[0].authorId,
      body: "A test reply",
      createdAt: actual.generatedAt,
      engagement: { likes: 0 },
    },
  ],
  engagement: { ...actual.items[0].engagement, replies: 1 },
};
const source = { ...actual, items: [fixtureItem] };
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
  let currentAccounts = accounts;
  let migrated = false;
  const fetcher = vi.fn(async (url: string) => {
    if (url.includes("manifest.json"))
      return {
        ok: true,
        json: async () => ({ ...sourceManifest, batches: refs }),
      };
    if (url.endsWith("accounts.json"))
      return { ok: true, json: async () => currentAccounts };
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
        items: [
          {
            ...source.items[0],
            id,
            authorId:
              migrated && id === "fresh"
                ? "new-column"
                : source.items[0].authorId,
          },
        ],
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
    migrate: () => {
      migrated = true;
      currentAccounts = [{ ...accounts[0], id: "new-column" }];
      refs = [fresh];
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
  it("drops old-world posts and pending batches when a new editorial population arrives", async () => {
    const mock = mockFeed();
    const interval = vi.spyOn(globalThis, "setInterval");
    const { result } = renderHook(() => useFeed());
    await waitFor(() => expect(result.current.isLoadingInitial).toBe(false));
    mock.migrate();
    await act(async () => {
      await (interval.mock.calls[0][0] as () => Promise<void>)();
    });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    await act(() => result.current.showNewPosts());
    expect(result.current.items.map((i) => i.id)).toEqual(["fresh"]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.accountsById.has("new-column")).toBe(true);
  });

  it("lets readers explore profiles, filter communities, and expand discussions", async () => {
    mockFeed();
    render(<FeedList />);
    await screen.findByRole("heading", {
      name: "Leave with something worth knowing.",
    });
    const author = accounts.find(
      (a: { id: string }) => a.id === source.items[0].authorId,
    );
    fireEvent.click(
      within(screen.getAllByRole("article")[0]).getAllByRole("button", {
        name: author.displayName,
      })[0],
    );
    expect(
      screen.getByRole("region", { name: `${author.displayName}'s profile` }),
    ).toBeInTheDocument();
    expect(screen.getByText(author.bio)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "← Back to feed" }));
    fireEvent.change(screen.getByLabelText("Explore a topic"), {
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

it("loads historical manifest pages on demand without losing batches after a failed request", async () => {
  let fail = true;
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    calls.push(url);
    if (url.endsWith("accounts.json")) return { ok: true, json: async () => accounts };
    if (url.includes("manifest.json")) return { ok: true, json: async () => ({ ...sourceManifest, batches: [first], olderManifest: "archive/page-0.json" }) };
    if (url.includes("archive/page-0.json")) {
      if (fail) throw new Error("offline");
      return { ok: true, json: async () => ({ ...sourceManifest, batches: [older] }) };
    }
    const id = url.includes("older") ? "older" : "first";
    return { ok: true, json: async () => ({ ...source, batchId: id, items: [{ ...source.items[0], id }] }) };
  }));
  const { result } = renderHook(() => useFeed());
  await waitFor(() => expect(result.current.isLoadingInitial).toBe(false));
  expect(calls.some(url => url.includes("archive/"))).toBe(false);
  await act(() => result.current.loadMore());
  expect(result.current.items.map(item => item.id)).toEqual(["first"]);
  expect(result.current.hasMore).toBe(true);
  fail = false;
  await act(() => result.current.loadMore());
  expect(result.current.items.map(item => item.id)).toEqual(["first", "older"]);
  expect(result.current.hasMore).toBe(false);
});
