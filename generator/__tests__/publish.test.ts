import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FeedItem, Manifest } from "../../schemas";
import {
  buildPublishPlan,
  writePublishPlan,
  type PublishCandidate,
} from "../publish";
import type { WorldState } from "../worldState";

const NOW = new Date("2026-09-15T12:00:00.000Z");
const DAY_MS = 24 * 3_600_000;

const emptyWorld: WorldState = {
  initialized: true,
  cycleCount: 1,
  communities: ["technology"],
  activeStorylines: [],
  characters: [],
  runningJokes: [],
  recentConflicts: [],
  currentTrends: [],
  unresolvedThreads: [],
  recentBatchSummaries: [],
};

function makeItem(id: string): FeedItem {
  return {
    id,
    kind: "text_post",
    authorId: "acc-1",
    createdAt: NOW.toISOString(),
    community: "technology",
    body: "hello",
    meta: { kind: "generic" },
    engagement: {
      likes: 1,
      reposts: 0,
      replies: 0,
      views: 10,
      viralityScore: 0.1,
    },
    comments: [],
  };
}

function baseCandidate(
  overrides: Partial<PublishCandidate> = {},
): PublishCandidate {
  return {
    runId: "run-new",
    now: NOW,
    items: [makeItem("post-1")],
    accounts: [],
    accountsChanged: false,
    nextWorld: emptyWorld,
    previousManifest: {
      schemaVersion: 1,
      generatedAt: NOW.toISOString(),
      latestRunId: "",
      batches: [],
    },
    ...overrides,
  };
}

describe("buildPublishPlan", () => {
  it("removes the previous world when bootstrapping a new population", () => {
    const plan = buildPublishPlan(
      baseCandidate({
        resetHistory: true,
        previousManifest: {
          schemaVersion: 1,
          generatedAt: NOW.toISOString(),
          latestRunId: "seed",
          batches: [
            {
              id: "seed",
              generatedAt: NOW.toISOString(),
              file: "batches/seed.json",
              itemCount: 1,
            },
          ],
        },
      }),
    );
    expect(plan.manifest.batches.map((b) => b.id)).toEqual(["run-new"]);
    expect(plan.prunedBatches).toEqual([]);
  });

  it("prepends the new batch to the manifest, newest first", () => {
    const plan = buildPublishPlan(baseCandidate());
    expect(plan.manifest.batches[0]?.id).toBe("run-new");
    expect(plan.manifest.latestRunId).toBe("run-new");
  });

  it("retains batches indefinitely alongside recent ones", () => {
    const previousManifest: Manifest = {
      schemaVersion: 1,
      generatedAt: NOW.toISOString(),
      latestRunId: "run-recent",
      batches: [
        {
          id: "run-recent",
          generatedAt: new Date(NOW.getTime() - 2 * DAY_MS).toISOString(),
          file: "batches/run-recent.json",
          itemCount: 1,
        },
        {
          id: "run-old",
          generatedAt: new Date(NOW.getTime() - 20 * DAY_MS).toISOString(),
          file: "batches/run-old.json",
          itemCount: 1,
        },
      ],
    };

    const plan = buildPublishPlan(baseCandidate({ previousManifest }));

    const retainedIds = plan.manifest.batches.map((b) => b.id);
    expect(retainedIds).toEqual(["run-new", "run-recent", "run-old"]);
    expect(plan.prunedBatches).toEqual([]);
  });

  it("throws rather than producing a plan when a candidate item is schema-invalid", () => {
    const invalidItem = {
      ...makeItem("post-1"),
      kind: "repost",
    } as unknown as FeedItem; // repost without referencedPostId
    expect(() =>
      buildPublishPlan(baseCandidate({ items: [invalidItem] })),
    ).toThrow();
  });

  it("omits accountsFile when accountsChanged is false", () => {
    const plan = buildPublishPlan(baseCandidate({ accountsChanged: false }));
    expect(plan.accountsFile).toBeUndefined();
  });
});

describe("writePublishPlan", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "dopamine-feed-publish-test-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes batch, manifest, and world files without deleting historical content", () => {
    const dataDir = path.join(dir, "data");
    const worldStatePath = path.join(dir, "world.json");

    // Pre-create an "old" batch file that should get pruned.
    const oldBatchDir = path.join(dataDir, "batches");
    const previousManifest: Manifest = {
      schemaVersion: 1,
      generatedAt: NOW.toISOString(),
      latestRunId: "run-old",
      batches: [
        {
          id: "run-old",
          generatedAt: new Date(NOW.getTime() - 20 * DAY_MS).toISOString(),
          file: "batches/run-old.json",
          itemCount: 1,
        },
      ],
    };
    const plan = buildPublishPlan(baseCandidate({ previousManifest }));

    // Simulate the old batch file existing on disk before publish.
    mkdirSync(oldBatchDir, { recursive: true });
    writeFileSync(path.join(oldBatchDir, "run-old.json"), "{}");

    writePublishPlan(plan, { dataDir, worldStatePath });

    expect(existsSync(path.join(dataDir, "batches", "run-new.json"))).toBe(
      true,
    );
    expect(existsSync(path.join(dataDir, "manifest.json"))).toBe(true);
    expect(existsSync(worldStatePath)).toBe(true);
    expect(existsSync(path.join(dataDir, "batches", "run-old.json"))).toBe(
      true,
    );

    const manifest = JSON.parse(
      readFileSync(path.join(dataDir, "manifest.json"), "utf8"),
    );
    expect(manifest.batches.map((b: { id: string }) => b.id)).toEqual([
      "run-new", "run-old",
    ]);
  });

  it("writes accounts.json only when accountsFile is present", () => {
    const dataDir = path.join(dir, "data");
    const worldStatePath = path.join(dir, "world.json");
    const plan = buildPublishPlan(baseCandidate());

    writePublishPlan(plan, { dataDir, worldStatePath });

    expect(existsSync(path.join(dataDir, "accounts.json"))).toBe(false);
  });
});
