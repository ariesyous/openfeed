// Replays the same-event headline heuristic over published batches, offline.
// Usage: node --import tsx scripts/calibrateSameEvent.ts [since-ISO-date] [window-hours]
// Each post's source titles are compared with source titles published in the
// previous window (default: the generator's 48 hours) and with earlier posts of
// the same batch, as generation would.
// Results are pairs the rule would have deferred; labels are a manual review.
import { readdirSync, readFileSync } from "node:fs";
import { coverageUrl } from "../generator/editorial/coverage";
import { SAME_EVENT_WINDOW_MS, sameEventIndex } from "../generator/editorial/sameEvent";

type Source = { url: string; title: string; publisher: string };
type Post = { batch: string; at: number; sources: Source[] };

const since = Date.parse(process.argv[2] ?? "2026-10-09T00:00:00Z");
const windowMs = process.argv[3] ? Number(process.argv[3]) * 3_600_000 : SAME_EVENT_WINDOW_MS;
const dir = "public/data/batches";
const posts: Post[] = readdirSync(dir).flatMap(file => {
  const batch = JSON.parse(readFileSync(`${dir}/${file}`, "utf8")) as { batchId: string; generatedAt: string; items: { editorial?: { sources: Source[] } }[] };
  const at = Date.parse(batch.generatedAt);
  return at < since ? [] : batch.items.flatMap(item => item.editorial ? [{ batch: batch.batchId, at, sources: item.editorial.sources }] : []);
}).sort((a, b) => a.at - b.at);

let matches = 0, matchedPosts = 0;
for (const [index, post] of posts.entries()) {
  const earlier = posts.slice(0, index).filter(other => other.batch === post.batch || post.at - other.at <= windowMs);
  const references = earlier.flatMap(other => other.sources);
  const recent = sameEventIndex(references.map(source => source.title));
  let matched = false;
  for (const source of post.sources) {
    const match = recent.match(source.title);
    if (!match) continue;
    const reference = references.find(other => other.title === match.title)!;
    // Republished article IDs are coverage, not same-event, matches.
    if (coverageUrl(reference.url) === coverageUrl(source.url)) continue;
    matches++; matched = true;
    const scope = earlier.find(other => other.sources.includes(reference))!.batch === post.batch ? "same run" : "window";
    console.log(`${new Date(post.at).toISOString().slice(0, 16)} ${scope} | ${source.publisher}: ${source.title} <- ${reference.publisher}: ${reference.title} [${match.shared.join(", ")}]`);
  }
  if (matched) matchedPosts++;
}
console.log(`posts=${posts.length} batches=${new Set(posts.map(post => post.batch)).size} matchedSources=${matches} matchedPosts=${matchedPosts}`);
