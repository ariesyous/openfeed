// Edition-wide limits. Retries, writing and review all consume the same budget.
// More capacity never changes the per-unit evidence or publication checks.
export const EDITORIAL_MAX_POSTS = 20;
export const EDITORIAL_MAX_ATTEMPTS = 32;
export const EDITORIAL_MAX_CHUNKS = EDITORIAL_MAX_ATTEMPTS / 2;
export const EDITORIAL_TIME_BUDGET_MS = 120 * 60_000;
