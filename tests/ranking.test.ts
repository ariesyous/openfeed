import { describe, expect, it } from "vitest";
import { rankBatch, scoreItem, type RankableItem } from "../src/lib/ranking";

function item(overrides: Partial<RankableItem["engagement"]> & { createdAt?: string } = {}): RankableItem {
  const { createdAt, ...engagementOverrides } = overrides;
  return {
    createdAt: createdAt ?? new Date().toISOString(),
    engagement: {
      likes: 0,
      reposts: 0,
      replies: 0,
      views: 0,
      viralityScore: 0,
      ...engagementOverrides,
    },
  };
}

describe("scoreItem", () => {
  it("increases with more likes, all else equal", () => {
    const now = new Date();
    const low = scoreItem(item({ likes: 5 }), now);
    const high = scoreItem(item({ likes: 500 }), now);
    expect(high).toBeGreaterThan(low);
  });

  it("decreases as an item ages, all else equal", () => {
    const now = new Date();
    const recent = item({ likes: 100, createdAt: new Date(now.getTime() - 1 * 3_600_000).toISOString() });
    const old = item({ likes: 100, createdAt: new Date(now.getTime() - 48 * 3_600_000).toISOString() });
    expect(scoreItem(recent, now)).toBeGreaterThan(scoreItem(old, now));
  });
});

describe("rankBatch", () => {
  it("is a stable sort: equal-score items keep their original relative order", () => {
    const now = new Date();
    const same = { createdAt: now.toISOString(), engagement: { likes: 1, reposts: 0, replies: 0, views: 1, viralityScore: 0 } };
    const items = [
      { ...same, id: "a" },
      { ...same, id: "b" },
      { ...same, id: "c" },
    ];
    const ranked = rankBatch(items, now);
    expect(ranked.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("orders higher-engagement items first", () => {
    const now = new Date();
    const items = [
      { id: "low", ...item({ likes: 2 }) },
      { id: "high", ...item({ likes: 1000, viralityScore: 0.9 }) },
      { id: "mid", ...item({ likes: 50 }) },
    ];
    const ranked = rankBatch(items, now);
    expect(ranked.map((i) => i.id)).toEqual(["high", "mid", "low"]);
  });
});
