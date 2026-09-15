import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyBounds,
  loadWorldState,
  mergeWorldStateUpdate,
  saveWorldState,
  type WorldState,
} from "../worldState";
import type { RawWorldStateUpdate } from "../rawSchemas";

const NOW = new Date("2026-09-15T12:00:00.000Z");

function baseState(overrides: Partial<WorldState> = {}): WorldState {
  return {
    initialized: true,
    cycleCount: 1,
    communities: ["technology"],
    activeStorylines: [],
    characters: [{ accountId: "acc-1", handle: "alice", memories: [] }],
    runningJokes: [],
    recentConflicts: [],
    currentTrends: [],
    unresolvedThreads: [],
    recentBatchSummaries: [],
    ...overrides,
  };
}

describe("loadWorldState", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "dopamine-feed-world-test-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("returns initialized:false when the file doesn't exist", () => {
    const state = loadWorldState(path.join(dir, "does-not-exist.json"));
    expect(state.initialized).toBe(false);
  });

  it("returns initialized:false for an empty `{}` file", () => {
    const filePath = path.join(dir, "world.json");
    saveWorldState({ ...baseState(), initialized: true }, filePath); // sanity: write something valid first
    // now overwrite with an empty object, simulating the placeholder pre-bootstrap file
    writeFileSync(filePath, "{}");
    const state = loadWorldState(filePath);
    expect(state.initialized).toBe(false);
  });

  it("round-trips a valid state through save and load", () => {
    const filePath = path.join(dir, "world.json");
    const state = baseState({ cycleCount: 5 });
    saveWorldState(state, filePath);
    const loaded = loadWorldState(filePath);
    expect(loaded.cycleCount).toBe(5);
    expect(loaded.initialized).toBe(true);
  });
});

describe("applyBounds", () => {
  it("trims character memories to the configured max", () => {
    const memories = Array.from({ length: 20 }, (_, i) => ({
      summary: `memory ${i}`,
      createdAtCycle: i,
    }));
    const state = baseState({
      characters: [{ accountId: "acc-1", handle: "alice", memories }],
    });
    const bounded = applyBounds(state);
    expect(bounded.characters[0]!.memories.length).toBeLessThanOrEqual(8);
    // keeps the most recent ones
    expect(bounded.characters[0]!.memories.at(-1)?.summary).toBe("memory 19");
  });

  it("trims active storylines, keeping the most recently touched", () => {
    const activeStorylines = Array.from({ length: 20 }, (_, i) => ({
      id: `story-${i}`,
      title: `t${i}`,
      summary: "s",
      involvedAccountIds: [],
      status: "active" as const,
      startedAtCycle: 0,
      lastTouchedCycle: i,
    }));
    const bounded = applyBounds(baseState({ activeStorylines }));
    expect(bounded.activeStorylines.length).toBeLessThanOrEqual(12);
    expect(bounded.activeStorylines.map((s) => s.id)).toContain("story-19");
    expect(bounded.activeStorylines.map((s) => s.id)).not.toContain("story-0");
  });
});

describe("mergeWorldStateUpdate", () => {
  const emptyDelta: RawWorldStateUpdate = {
    newStorylines: [],
    updatedStorylineIds: [],
    newRunningJokes: [],
    newConflicts: [],
    currentTrends: [],
    cycleSummary: "nothing much happened",
  };

  it("increments cycleCount and appends exactly one batch summary", () => {
    const state = baseState({ cycleCount: 3 });
    const next = mergeWorldStateUpdate(state, emptyDelta, {
      cycle: 4,
      batchId: "batch-4",
      now: NOW,
      handleToAccountId: new Map(),
    });

    expect(next.cycleCount).toBe(4);
    expect(next.recentBatchSummaries).toHaveLength(1);
    expect(next.recentBatchSummaries[0]?.summary).toBe("nothing much happened");
  });

  it("bounds recentBatchSummaries after repeated merges", () => {
    let state = baseState();
    for (let cycle = 1; cycle <= 10; cycle++) {
      state = mergeWorldStateUpdate(state, { ...emptyDelta, cycleSummary: `cycle ${cycle}` }, {
        cycle,
        batchId: `batch-${cycle}`,
        now: NOW,
        handleToAccountId: new Map(),
      });
    }
    expect(state.recentBatchSummaries.length).toBeLessThanOrEqual(5);
    expect(state.recentBatchSummaries.at(-1)?.summary).toBe("cycle 10");
  });

  it("adds new storylines and resolves involvedHandles to account ids", () => {
    const state = baseState();
    const next = mergeWorldStateUpdate(
      state,
      {
        ...emptyDelta,
        newStorylines: [
          { title: "T", summary: "S", involvedHandles: ["alice"], status: "active" },
        ],
      },
      { cycle: 2, batchId: "b2", now: NOW, handleToAccountId: new Map([["alice", "acc-1"]]) },
    );
    expect(next.activeStorylines).toHaveLength(1);
    expect(next.activeStorylines[0]?.involvedAccountIds).toEqual(["acc-1"]);
  });
});
