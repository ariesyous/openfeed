import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import type { Account } from "../schemas";
import {
  MAX_ACTIVE_STORYLINES,
  MAX_GLOBAL_TRENDS,
  MAX_MEMORIES_PER_CHARACTER,
  MAX_RECENT_BATCH_SUMMARIES,
  MAX_RECENT_CONFLICTS,
  MAX_RUNNING_JOKES,
  MAX_UNRESOLVED_THREADS,
  WORLD_STATE_PATH,
} from "./config";
import type { RawWorldStateUpdate } from "./rawSchemas";

const CharacterMemorySchema = z.object({
  summary: z.string().min(1).max(240),
  createdAtCycle: z.number().int().nonnegative(),
});

const CharacterStateSchema = z.object({
  accountId: z.string().min(1),
  handle: z.string().min(1),
  memories: z.array(CharacterMemorySchema).max(MAX_MEMORIES_PER_CHARACTER),
  currentMood: z.string().max(60).optional(),
});
export type CharacterState = z.infer<typeof CharacterStateSchema>;

const StorylineSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(400),
  involvedAccountIds: z.array(z.string()).max(10),
  status: z.enum(["active", "escalating", "cooling", "resolved"]),
  startedAtCycle: z.number().int().nonnegative(),
  lastTouchedCycle: z.number().int().nonnegative(),
});
export type Storyline = z.infer<typeof StorylineSchema>;

const RunningJokeSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1).max(200),
  originAccountIds: z.array(z.string()).max(5),
  lastUsedCycle: z.number().int().nonnegative(),
  useCount: z.number().int().nonnegative(),
});
export type RunningJoke = z.infer<typeof RunningJokeSchema>;

const ConflictSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1).max(300),
  accountIds: z.array(z.string()).max(6),
  startedAtCycle: z.number().int().nonnegative(),
  heat: z.enum(["simmering", "active", "cooling"]),
});
export type Conflict = z.infer<typeof ConflictSchema>;

const TrendSchema = z.object({
  topic: z.string().min(1).max(80),
  community: z.string().min(1).max(40),
  strength: z.number().min(0).max(1),
  startedAtCycle: z.number().int().nonnegative(),
});
export type Trend = z.infer<typeof TrendSchema>;

const UnresolvedThreadSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1).max(300),
  relatedStorylineId: z.string().optional(),
});
export type UnresolvedThread = z.infer<typeof UnresolvedThreadSchema>;

const BatchSummarySchema = z.object({
  batchId: z.string().min(1),
  generatedAtCycle: z.number().int().nonnegative(),
  summary: z.string().min(1).max(500),
});
export type BatchSummary = z.infer<typeof BatchSummarySchema>;

export const WorldStateSchema = z.object({
  contentMode: z.literal("editorial").optional(),
  coveredSourceUrls: z.array(z.string().url()).max(200).optional(),
  initialized: z.boolean(),
  cycleCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime().optional(),
  lastRunAt: z.string().datetime().optional(),
  communities: z.array(z.string().min(1).max(40)).max(20),
  activeStorylines: z.array(StorylineSchema).max(MAX_ACTIVE_STORYLINES),
  characters: z.array(CharacterStateSchema),
  runningJokes: z.array(RunningJokeSchema).max(MAX_RUNNING_JOKES),
  recentConflicts: z.array(ConflictSchema).max(MAX_RECENT_CONFLICTS),
  currentTrends: z.array(TrendSchema).max(MAX_GLOBAL_TRENDS),
  unresolvedThreads: z.array(UnresolvedThreadSchema).max(MAX_UNRESOLVED_THREADS),
  recentBatchSummaries: z.array(BatchSummarySchema).max(MAX_RECENT_BATCH_SUMMARIES),
});
export type WorldState = z.infer<typeof WorldStateSchema>;

function emptyWorldState(): WorldState {
  return {
    initialized: false,
    cycleCount: 0,
    communities: [],
    activeStorylines: [],
    characters: [],
    runningJokes: [],
    recentConflicts: [],
    currentTrends: [],
    unresolvedThreads: [],
    recentBatchSummaries: [],
  };
}

/** Reads world.json. A missing file, an empty `{}`, or anything that fails to parse/validate
 * is treated as "no world yet" (initialized: false) -- this is the documented bootstrap
 * trigger (ProjectSpecifications.md §25), not an error. */
export function loadWorldState(path: string = WORLD_STATE_PATH): WorldState {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return emptyWorldState();
  }

  const result = WorldStateSchema.safeParse(raw);
  return result.success ? result.data : emptyWorldState();
}

export function saveWorldState(state: WorldState, path: string = WORLD_STATE_PATH): void {
  writeFileSync(path, `${JSON.stringify(WorldStateSchema.parse(state), null, 2)}\n`);
}

/** Trims every bounded array to its configured max, dropping lowest-priority entries first,
 * so state never grows without limit (§11) regardless of how many cycles have run. */
export function applyBounds(state: WorldState): WorldState {
  const byLastTouched = [...state.activeStorylines].sort(
    (a, b) => b.lastTouchedCycle - a.lastTouchedCycle,
  );
  const byLastUsed = [...state.runningJokes].sort((a, b) => b.lastUsedCycle - a.lastUsedCycle);
  const byStarted = [...state.recentConflicts].sort((a, b) => b.startedAtCycle - a.startedAtCycle);
  const byTrendStart = [...state.currentTrends].sort((a, b) => b.startedAtCycle - a.startedAtCycle);
  const byThreadOrder = state.unresolvedThreads.slice(-MAX_UNRESOLVED_THREADS);
  const byBatchOrder = state.recentBatchSummaries.slice(-MAX_RECENT_BATCH_SUMMARIES);

  return {
    ...state,
    activeStorylines: byLastTouched.slice(0, MAX_ACTIVE_STORYLINES),
    runningJokes: byLastUsed.slice(0, MAX_RUNNING_JOKES),
    recentConflicts: byStarted.slice(0, MAX_RECENT_CONFLICTS),
    currentTrends: byTrendStart.slice(0, MAX_GLOBAL_TRENDS),
    unresolvedThreads: byThreadOrder,
    recentBatchSummaries: byBatchOrder,
    characters: state.characters.map((c) => ({
      ...c,
      memories: c.memories.slice(-MAX_MEMORIES_PER_CHARACTER),
    })),
  };
}

/** Pure function producing the candidate next world state from an LLM-proposed delta.
 * The caller validates the result with WorldStateSchema.parse before treating it as final. */
export function mergeWorldStateUpdate(
  current: WorldState,
  delta: RawWorldStateUpdate,
  ctx: { cycle: number; batchId: string; now: Date; handleToAccountId: Map<string, string> },
): WorldState {
  const resolveIds = (handles: string[]): string[] =>
    handles.map((h) => ctx.handleToAccountId.get(h)).filter((id): id is string => !!id);

  const storylineById = new Map(current.activeStorylines.map((s) => [s.id, s]));
  for (const update of delta.updatedStorylineIds) {
    const existing = storylineById.get(update.id);
    if (existing) {
      storylineById.set(update.id, {
        ...existing,
        summary: update.summary,
        status: update.status,
        lastTouchedCycle: ctx.cycle,
      });
    }
  }
  for (const created of delta.newStorylines) {
    const id = `story-${ctx.cycle}-${storylineById.size}`;
    storylineById.set(id, {
      id,
      title: created.title,
      summary: created.summary,
      involvedAccountIds: resolveIds(created.involvedHandles),
      status: created.status,
      startedAtCycle: ctx.cycle,
      lastTouchedCycle: ctx.cycle,
    });
  }

  const jokes = [...current.runningJokes];
  for (const joke of delta.newRunningJokes) {
    jokes.push({
      id: `joke-${ctx.cycle}-${jokes.length}`,
      description: joke.description,
      originAccountIds: resolveIds(joke.originHandles),
      lastUsedCycle: ctx.cycle,
      useCount: 1,
    });
  }

  const conflicts = [...current.recentConflicts];
  for (const conflict of delta.newConflicts) {
    conflicts.push({
      id: `conflict-${ctx.cycle}-${conflicts.length}`,
      description: conflict.description,
      accountIds: resolveIds(conflict.handles),
      startedAtCycle: ctx.cycle,
      heat: conflict.heat,
    });
  }

  const charactersByHandle = new Map(current.characters.map((c) => [c.handle, c]));
  for (const [handle, memories] of Object.entries(delta.newMemoriesByHandle ?? {})) {
    const existing = charactersByHandle.get(handle);
    if (!existing) continue;
    charactersByHandle.set(handle, {
      ...existing,
      memories: [
        ...existing.memories,
        ...memories.map((summary) => ({ summary, createdAtCycle: ctx.cycle })),
      ],
    });
  }

  const next: WorldState = {
    ...current,
    cycleCount: ctx.cycle,
    lastRunAt: ctx.now.toISOString(),
    activeStorylines: [...storylineById.values()],
    runningJokes: jokes,
    recentConflicts: conflicts,
    currentTrends: delta.currentTrends.map((t) => ({
      topic: t.topic,
      community: t.community,
      strength: t.strength,
      startedAtCycle: ctx.cycle,
    })),
    characters: [...charactersByHandle.values()],
    recentBatchSummaries: [
      ...current.recentBatchSummaries,
      { batchId: ctx.batchId, generatedAtCycle: ctx.cycle, summary: delta.cycleSummary },
    ],
  };

  return applyBounds(next);
}

/** Builds the initial world state after a successful bootstrap. */
export function buildInitialWorldState(params: {
  now: Date;
  communities: string[];
  accounts: Account[];
  initialStorylines: Array<{ title: string; summary: string; involvedAccountIds: string[] }>;
}): WorldState {
  const base = emptyWorldState();
  return applyBounds({
    ...base,
    initialized: true,
    cycleCount: 0,
    createdAt: params.now.toISOString(),
    lastRunAt: params.now.toISOString(),
    communities: params.communities,
    characters: params.accounts.map((a) => ({
      accountId: a.id,
      handle: a.handle,
      memories: [],
    })),
    activeStorylines: params.initialStorylines.map((s, index) => ({
      id: `story-0-${index}`,
      title: s.title,
      summary: s.summary,
      involvedAccountIds: s.involvedAccountIds,
      status: "active",
      startedAtCycle: 0,
      lastTouchedCycle: 0,
    })),
  });
}

/** Compact, bounded-size projection of world state for prompt injection -- rendering short
 * lines per entity is what actually keeps prompt token count bounded (the schema's array
 * .max() calls bound state growth, but this controls what gets serialized into the prompt). */
export function summarizeWorldStateForPrompt(state: WorldState): string {
  const lines: string[] = [];
  lines.push(`Cycle: ${state.cycleCount}`);
  lines.push(`Communities: ${state.communities.join(", ") || "(none yet)"}`);

  if (state.activeStorylines.length > 0) {
    lines.push("Active storylines:");
    for (const s of state.activeStorylines) {
      lines.push(`- [${s.id}] (${s.status}) ${s.title}: ${s.summary}`);
    }
  }
  if (state.runningJokes.length > 0) {
    lines.push("Running jokes:");
    for (const j of state.runningJokes) {
      lines.push(`- [${j.id}] ${j.description} (used ${j.useCount}x)`);
    }
  }
  if (state.recentConflicts.length > 0) {
    lines.push("Recent conflicts:");
    for (const c of state.recentConflicts) {
      lines.push(`- [${c.id}] (${c.heat}) ${c.description}`);
    }
  }
  if (state.currentTrends.length > 0) {
    lines.push("Current trends:");
    for (const t of state.currentTrends) {
      lines.push(`- ${t.topic} in ${t.community} (strength ${t.strength})`);
    }
  }
  if (state.unresolvedThreads.length > 0) {
    lines.push("Unresolved threads:");
    for (const t of state.unresolvedThreads) {
      lines.push(`- [${t.id}] ${t.description}`);
    }
  }
  if (state.recentBatchSummaries.length > 0) {
    lines.push("Recent cycle summaries (most recent last):");
    for (const b of state.recentBatchSummaries) {
      lines.push(`- (cycle ${b.generatedAtCycle}) ${b.summary}`);
    }
  }

  const charactersWithMemories = state.characters.filter((c) => c.memories.length > 0);
  if (charactersWithMemories.length > 0) {
    lines.push("Character memories:");
    for (const c of charactersWithMemories) {
      const recent = c.memories.slice(-3).map((m) => m.summary);
      lines.push(`- @${c.handle}: ${recent.join(" | ")}`);
    }
  }

  return lines.join("\n");
}
