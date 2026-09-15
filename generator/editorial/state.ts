import type { FeedItem } from "../../schemas";
import { WorldStateSchema, type WorldState } from "../worldState";
export function makeEditorialWorld(
  previous: WorldState,
  items: FeedItem[],
  now: Date,
  runId: string,
): WorldState {
  const cycleCount =
    previous.contentMode === "editorial" ? previous.cycleCount + 1 : 1;
  return WorldStateSchema.parse({
    contentMode: "editorial",
    initialized: true,
    cycleCount,
    createdAt:
      previous.contentMode === "editorial"
        ? previous.createdAt
        : now.toISOString(),
    lastRunAt: now.toISOString(),
    coveredSourceUrls: [
      ...new Set([
        ...(previous.coveredSourceUrls ?? []),
        ...items.flatMap((i) => i.editorial?.sources.map((s) => s.url) ?? []),
      ]),
    ].slice(-200),
    communities: ["technology", "science", "world"],
    activeStorylines: [],
    characters: [],
    runningJokes: [],
    recentConflicts: [],
    currentTrends: [],
    unresolvedThreads: [],
    recentBatchSummaries: [
      {
        batchId: runId,
        generatedAtCycle: cycleCount,
        summary: items
          .map((i) => i.title)
          .join("; ")
          .slice(0, 500),
      },
    ],
  });
}
