/** Resolves a path under public/data/ relative to the app's base path (root locally, /openfeed/ on GitHub Pages). */
export function dataUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}data/${path}`.replace(/([^:])\/{2,}/g, "$1/");
}

/**
 * manifest.json is mutable, so browsers must not cache it indefinitely. Bucketing the
 * cache-busting query by a short time window keeps requests cache-friendly within the
 * window while guaranteeing a returning visitor sees new batches before too long.
 */
export function manifestUrl(): string {
  const bucketMs = 5 * 60_000;
  const bucket = Math.floor(Date.now() / bucketMs);
  return `${dataUrl("manifest.json")}?t=${bucket}`;
}
