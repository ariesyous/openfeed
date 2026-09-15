import { randomBytes } from "node:crypto";

/** Returns a function that yields sequential ids like "post-3f" scoped to this process. */
export function createIdGenerator(prefix: string): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}-${counter.toString(36)}`;
  };
}

function compactIsoTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

/** Run/batch id in the compact form ProjectSpecifications.md §16 shows, e.g. "20260915T031700Z-a81d".
 * Used as both the batch filename stem and a namespace for this run's ids, so ids from
 * different runs never collide without needing to scan prior history. */
export function createRunId(now: Date = new Date()): string {
  const suffix = randomBytes(2).toString("hex");
  return `${compactIsoTimestamp(now)}-${suffix}`;
}
