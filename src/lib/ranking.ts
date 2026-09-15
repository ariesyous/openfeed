export interface RankableItem {
  createdAt: string;
  engagement: {
    likes: number;
    reposts: number;
    replies: number;
    views: number;
    viralityScore: number;
  };
}

function ageHours(createdAt: string, now: Date): number {
  return Math.max(0, (now.getTime() - new Date(createdAt).getTime()) / 3_600_000);
}

/**
 * Modest client-side ranking score: engagement (weighted, log-dampened so a handful of
 * viral outliers don't completely dominate) combined with a recency boost that fades
 * over roughly a day. Never used to reorder across batch boundaries.
 */
export function scoreItem(item: RankableItem, now: Date = new Date()): number {
  const weightedEngagement =
    item.engagement.likes +
    item.engagement.replies * 2 +
    item.engagement.reposts * 3 +
    item.engagement.views * 0.05;
  const engagementScore = Math.log1p(weightedEngagement) * (1 + item.engagement.viralityScore);
  const recencyBoost = 1 / (1 + ageHours(item.createdAt, now) / 6);

  return engagementScore * (0.6 + 0.4 * recencyBoost);
}

/** Stable sort: items with equal scores keep their original relative order. */
export function rankBatch<T extends RankableItem>(items: T[], now: Date = new Date()): T[] {
  return items
    .map((item, index) => ({ item, index, score: scoreItem(item, now) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
