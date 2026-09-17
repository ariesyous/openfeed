function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// A function, not a top-level const: config.ts is statically imported (and its
// top-level evaluated) before generate.ts's main() calls loadEnvFile(), so a
// top-level const here would always see OPENROUTER_MODEL as unset and silently
// fall back to openrouter/free regardless of .env.
export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL || "openrouter/free";
}
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export const ITEMS_PER_CYCLE = envInt("GEN_ITEMS_PER_CYCLE", 20);
export const COMMENTS_MIN_PER_CYCLE = envInt("GEN_COMMENTS_MIN", 25);
export const COMMENTS_MAX_PER_CYCLE = envInt("GEN_COMMENTS_MAX", 60);

export const BOOTSTRAP_MIN_ACCOUNTS = envInt("GEN_BOOTSTRAP_MIN_ACCOUNTS", 30);
export const BOOTSTRAP_MAX_ACCOUNTS = envInt("GEN_BOOTSTRAP_MAX_ACCOUNTS", 50);

export const MAX_ATTEMPTS = envInt("GEN_MAX_ATTEMPTS", 5);

// Explicit completion-length ceilings. Without these, a randomly-picked openrouter/free
// model may default to a small max_tokens and silently truncate a large structured
// response mid-JSON. A 400 citing the token limit is treated as retryable (see
// openrouter.ts) so a stricter random pick on one attempt doesn't kill the whole run --
// there's little downside to a generous ceiling since it only caps how far a model
// *can* go, it doesn't make a concise model ramble.
//
// Bootstrap only ever runs once (until the world is reset -- see worldState.ts), so it
// gets a much bigger budget than advance-world, which runs every cycle: 30-50 full
// account objects is a lot of output, and unlike a recurring cycle, nothing downstream
// is time-sensitive about a one-time setup step taking a while.
export const BOOTSTRAP_MAX_TOKENS = envInt("GEN_BOOTSTRAP_MAX_TOKENS", 64_000);
// Raised from 6000 after live testing: a full cycle (20 items + 25-60 comments) got
// silently cut off mid-JSON at 6000 tokens on google/gemini-3.8-flash, producing
// invalid_json on every attempt (see retry.ts's stripCodeFence/JSON.parse failure).
// Gemini's reasoning is mandatory on this endpoint (can't be disabled -- confirmed via
// a live 400) and its reasoning tokens are drawn from the same max_tokens budget as the
// actual JSON output, so the ceiling needs headroom for both, not just the JSON itself.
export const ADVANCE_WORLD_MAX_TOKENS = envInt("GEN_ADVANCE_WORLD_MAX_TOKENS", 24_000);

// A larger max_tokens needs a longer per-request timeout -- these are correlated, not
// independent: response headers can arrive before the body finishes writing, so a slow
// free model can get aborted mid-body-read well before it reaches the token ceiling if
// the timeout isn't generous enough (observed firsthand: attempts consistently timed
// out right at the previous default once max_tokens was raised without also raising
// this). Bootstrap being a one-time step affords a long wait here too.
export const BOOTSTRAP_TIMEOUT_MS = envInt("GEN_BOOTSTRAP_TIMEOUT_MS", 900_000);
// Raised twice via live testing: 60s -> 150s -> 240s, each time hitting the exact
// ceiling on an otherwise-plausible attempt. The real bottleneck turns out to be
// per-model generation speed (tokens/sec), not output size -- a slow random free-model
// pick is slow regardless of how small the ask is, so this now matches bootstrap's
// generous budget rather than trying to guess a smaller "should be enough" number.
export const ADVANCE_WORLD_TIMEOUT_MS = envInt("GEN_ADVANCE_WORLD_TIMEOUT_MS", 900_000);
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
