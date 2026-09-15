import type { CommentEngagement, Engagement, FeedItemKind } from "../schemas";
import { CYCLE_WINDOW_HOURS, VIRAL_CHANCE } from "./config";

export type Rng = () => number;

/** Same well-known small PRNG used by scripts/seed -- fine to duplicate, it's a few lines. */
export function mulberry32(seed: number): Rng {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a style hash, only needs to be stable, not cryptographic. */
export function hashStringToInt(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A run's own RNG, seeded from its run id: reproducible if re-validated within a run,
 * different across runs. */
export function createRunRng(runId: string): Rng {
  return mulberry32(hashStringToInt(runId));
}

export function pickIsViral(rng: Rng, viralChance: number = VIRAL_CHANCE): boolean {
  return rng() < viralChance;
}

export interface EngagementInput {
  kind: FeedItemKind;
  ageHours: number;
  isViral: boolean;
  replyCount: number;
}

/** App-side engagement synthesis (never trusted from the LLM, per ProjectSpecifications.md §20).
 * Plausible and varied rather than uniformly random: a few outliers dramatically
 * outperform the median, and engagement generally scales with how "settled" an item
 * is within its generation window unless flagged viral. */
export function synthesizeEngagement(rng: Rng, input: EngagementInput): Engagement {
  const ageFactor = Math.min(1, input.ageHours / CYCLE_WINDOW_HOURS);
  const baseline = 5 + rng() * 40;
  const viralMultiplier = input.isViral ? 15 + rng() * 35 : 1;

  const likes = Math.round(baseline * (0.4 + ageFactor) * viralMultiplier * (0.6 + rng() * 0.8));
  const reposts = Math.round(likes * (0.05 + rng() * 0.15));
  const views = Math.round(likes * (6 + rng() * 10));
  const viralityScore = input.isViral
    ? Math.min(1, 0.7 + rng() * 0.3)
    : Math.min(0.6, rng() * 0.25);

  return {
    likes,
    reposts,
    replies: input.replyCount,
    views,
    viralityScore: Math.round(viralityScore * 100) / 100,
  };
}

export function synthesizeCommentEngagement(rng: Rng, hasParent: boolean): CommentEngagement {
  const base = hasParent ? rng() * 15 : rng() * 60;
  return { likes: Math.round(base) };
}

export type RelativeAgeHint = "fresh" | "recent" | "older";

const AGE_HINT_RANGES: Record<RelativeAgeHint, [number, number]> = {
  fresh: [0, 0.2],
  recent: [0.2, 0.6],
  older: [0.6, 1],
};

/** Spreads a cycle's items across the trailing generation window so createdAt timestamps
 * within a batch aren't all identical, honoring each item's relative-age hint when given. */
export function assignAges(
  rng: Rng,
  hints: Array<RelativeAgeHint | undefined>,
  now: Date,
  windowHours: number = CYCLE_WINDOW_HOURS,
): Date[] {
  return hints.map((hint) => {
    const [min, max] = hint ? AGE_HINT_RANGES[hint] : [0, 1];
    const fraction = min + rng() * (max - min);
    const ageHours = fraction * windowHours;
    return new Date(now.getTime() - ageHours * 3_600_000);
  });
}
