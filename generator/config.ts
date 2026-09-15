function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const ITEMS_PER_CYCLE = envInt("GEN_ITEMS_PER_CYCLE", 20);
export const COMMENTS_MIN_PER_CYCLE = envInt("GEN_COMMENTS_MIN", 25);
export const COMMENTS_MAX_PER_CYCLE = envInt("GEN_COMMENTS_MAX", 60);

export const BOOTSTRAP_MIN_ACCOUNTS = envInt("GEN_BOOTSTRAP_MIN_ACCOUNTS", 30);
export const BOOTSTRAP_MAX_ACCOUNTS = envInt("GEN_BOOTSTRAP_MAX_ACCOUNTS", 50);

// V1 retains ~14 days of batches in public/data/batches; older ones are pruned
// on publish. Continuity beyond that window lives in world-state summaries,
// not in old batch files (see worldState.ts).
export const RETENTION_DAYS = envInt("GEN_RETENTION_DAYS", 14);

export const MAX_ATTEMPTS = envInt("GEN_MAX_ATTEMPTS", 5);
// Base backoff delays (ms) before attempts 2..5; attempt 1 never waits. Jitter
// is added on top by the retry loop. ~2/5/10/20s per ProjectSpecifications.md §14.
export const BACKOFF_BASE_MS = [2000, 5000, 10000, 20000];

// World-state bounds (§11). Not spec-mandated numbers -- chosen here to keep a
// generation prompt in the low single-digit KB range even after months of
// cycles, while still carrying enough continuity for callbacks/running jokes
// across the retention window (~14 days * ~8 cycles/day = ~112 cycles).
export const MAX_ACTIVE_STORYLINES = envInt("GEN_MAX_STORYLINES", 12);
export const MAX_MEMORIES_PER_CHARACTER = envInt("GEN_MAX_MEMORIES_PER_CHAR", 8);
export const MAX_GLOBAL_TRENDS = envInt("GEN_MAX_TRENDS", 8);
export const MAX_RUNNING_JOKES = envInt("GEN_MAX_JOKES", 10);
export const MAX_RECENT_CONFLICTS = envInt("GEN_MAX_CONFLICTS", 6);
export const MAX_UNRESOLVED_THREADS = envInt("GEN_MAX_UNRESOLVED_THREADS", 10);
export const MAX_RECENT_BATCH_SUMMARIES = envInt("GEN_MAX_BATCH_SUMMARIES", 5);

export const WORLD_STATE_PATH = "generator/state/world.json";
export const PUBLIC_DATA_DIR = "public/data";

// Each generation cycle's items are spread across this trailing window so
// createdAt timestamps within a batch aren't all identical.
export const CYCLE_WINDOW_HOURS = 3;

// Fraction of a cycle's items that get a viral engagement outlier.
export const VIRAL_CHANCE = 0.04;
