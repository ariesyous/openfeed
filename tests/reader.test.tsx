import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { useReader } from "../src/hooks/useReader";
import type { FeedItem } from "../schemas";
const manifest = JSON.parse(readFileSync("public/data/manifest.json", "utf8"));
const item = JSON.parse(readFileSync(`public/data/${manifest.batches[0].file}`, "utf8")).items[0] as FeedItem;
beforeEach(() => { localStorage.clear(); });
describe("device-local reading state", () => {
  it("saves articles across visits without marking loaded content as read", () => {
    const first = renderHook(() => useReader());
    expect(first.result.current.readIds).toEqual([]);
    act(() => first.result.current.toggleSave(item));
    first.unmount();
    const second = renderHook(() => useReader());
    expect(second.result.current.saved[0].id).toBe(item.id);
    expect(second.result.current.previousVisit).not.toBeNull();
    expect(second.result.current.readIds).toEqual([]);
    act(() => second.result.current.markRead(item));
    expect(second.result.current.readIds).toContain(item.id);
    act(() => second.result.current.toggleSave(item));
    expect(second.result.current.saved).toHaveLength(0);
  });
  it("keeps a caught-up checkpoint after subsequent actions", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-17T10:00:00Z"));
      const view = renderHook(() => useReader());
      vi.setSystemTime(new Date("2026-09-17T11:00:00Z"));
      act(() => view.result.current.markCaughtUp());
      act(() => view.result.current.toggleSave(item));
      expect(JSON.parse(localStorage.getItem("openfeed-reader-v1")!).lastVisit).toBe("2026-09-17T11:00:00.000Z");
    } finally { vi.useRealTimers(); }
  });
  it("handles corrupt or unavailable storage while retaining in-memory actions", () => {
    localStorage.setItem("openfeed-reader-v1", "broken");
    const view = renderHook(() => useReader());
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    try {
      act(() => view.result.current.toggleSave(item));
      expect(view.result.current.saved).toHaveLength(1);
      expect(view.result.current.notice).toContain("this visit only");
    } finally { spy.mockRestore(); }
  });
});
