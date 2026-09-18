/** Explicit, fixed-page retrieval only. No model calls, publication or saved HTML. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { articleExcerpt, EVERGREEN_SOURCES } from "../generator/editorial/evergreen";
import { prepareEvidence } from "../generator/editorial/evidence";
import { readBounded } from "../generator/editorial/sources";
import pilot from "../docs/fixtures/editorial-source-pilot.json";

if (!process.argv.includes("--live")) {
  console.log(`Reviewed ${pilot.sources.length} source packets; pass --live to recheck only these fixed pages without model calls.`);
} else {
  // Use the same coverage input only for reporting, never reset or write it.
  const world = JSON.parse(readFileSync(new URL("../generator/state/world.json", import.meta.url), "utf8"));
  const covered = new Set<string>(world.coveredSourceUrls ?? []);
  const results = await Promise.all(pilot.sources.map(async (review) => {
    const source = EVERGREEN_SOURCES.find(source => source.url === review.url);
    if (!source) throw new Error("Reviewed URL is missing from the fixed shelf");
    try {
      const response = await fetch(source.url, {
        signal: AbortSignal.timeout(20_000), redirect: "error", headers: { Accept: "text/html" },
      });
      const excerpt = articleExcerpt(await readBounded(response));
      const prepared = prepareEvidence([{ ...source, id: "pilot", excerpt, evergreen: true, retrievedAt: new Date().toISOString() }]);
      const offered = prepared.sources[0]?.evidence ?? [];
      const unchanged = createHash("sha256").update(excerpt).digest("hex") === review.excerptSha256;
      const supportMatches = review.support.every(expected => offered.some(actual =>
        actual.id === expected.id && actual.text === expected.text && actual.parts === expected.parts && actual.part === expected.part));
      return { title: source.title, eligible: excerpt.length >= 300 && offered.length > 0,
        covered: covered.has(source.url), excerptCharacters: excerpt.length, evidenceCount: offered.length,
        unchanged, supportMatches, reviewNeeded: !unchanged || !supportMatches };
    } catch {
      return { title: source.title, eligible: false, reviewNeeded: true };
    }
  }));
  console.log(JSON.stringify(results, null, 2));
  if (results.some(result => !result.eligible || result.reviewNeeded)) process.exitCode = 1;
}
