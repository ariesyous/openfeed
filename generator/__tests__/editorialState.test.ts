import { describe, expect, it } from "vitest";
import { makeEditorialWorld } from "../editorial/state";
import { MAX_RECENT_BATCH_SUMMARIES } from "../config";
import { WorldStateSchema } from "../worldState";
import { buildPublishPlan } from "../publish";
import type { FeedItem, Manifest } from "../../schemas";

const now = new Date("2026-09-16T00:00:00Z");
const initial = WorldStateSchema.parse({
  initialized: false, cycleCount: 0, communities: [], activeStorylines: [],
  characters: [], runningJokes: [], recentConflicts: [], currentTrends: [],
  unresolvedThreads: [], recentBatchSummaries: [],
});
const item: FeedItem = {
  id: "post", authorId: "editorial-explainer", kind: "text_post", community: "science",
  title: "A sourced explanation", body: "A useful explanation of a sourced idea.",
  createdAt: now.toISOString(), meta: {kind: "generic"}, comments: [],
  engagement: {likes: 0, replies: 0, reposts: 0, views: 0, viralityScore: 0},
  editorial: {format: "explainer", basis: "publisher_excerpt", sources: [{
    url: "https://example.com/article", title: "Original source", publisher: "Publisher",
    publishedAt: now.toISOString(), retrievedAt: now.toISOString(),
  }]},
};

describe("editorial history rollover", () => {
  it("continues building publish plans beyond a full history, retaining the newest summaries", () => {
    let world = initial;
    let manifest: Manifest = {schemaVersion: 1, generatedAt: now.toISOString(), latestRunId: "initial", batches: []};
    const ids: string[] = [];
    for (let cycle = 1; cycle <= MAX_RECENT_BATCH_SUMMARIES + 7; cycle++) {
      const id = `run-${cycle}`;
      ids.push(id);
      const before = structuredClone(world);
      const nextWorld = makeEditorialWorld(world, [item], now, id);
      const plan = buildPublishPlan({
        runId: id, now, items: [item], accounts: [], accountsChanged: false,
        nextWorld, previousManifest: manifest,
      });
      expect(world).toEqual(before);
      expect(plan.world.recentBatchSummaries.map((entry) => entry.batchId))
        .toEqual(ids.slice(-MAX_RECENT_BATCH_SUMMARIES));
      expect(plan.world.cycleCount).toBe(cycle);
      expect(plan.manifest.latestRunId).toBe(id);
      world = plan.world;
      manifest = plan.manifest;
    }
    expect(world.coveredSourceUrls).toEqual(["https://example.com/article"]);
  });
});
