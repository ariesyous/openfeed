import { appendFileSync, readFileSync } from "node:fs";
import { ManifestSchema } from "../schemas";
import { PUBLIC_DATA_DIR, WORLD_STATE_PATH } from "./config";
import { getApiKey, loadEnvFile } from "./env";
import { createRunId } from "./ids";
import { buildPublishPlan, writePublishPlan } from "./publish";
import { loadWorldState } from "./worldState";
import { collectSources } from "./editorial/sources";
import { EDITORIAL_MAX_POSTS, generateEditorial } from "./editorial/generate";
import { makeEditorialWorld } from "./editorial/state";
import { coverageTitle } from "./editorial/coverage";
import { editorialAccounts } from "./editorial/accounts";
import { createEditorialAudit, publishWithAudit } from "./editorial/audit";

async function main() {
  loadEnvFile();
  const now = new Date(),
    runId = createRunId();
  const audit = process.env.EDITORIAL_AUDIT_DIR
    ? createEditorialAudit({ directory: process.env.EDITORIAL_AUDIT_DIR, runId, now }) : undefined;
  const previous = loadWorldState();
  const manifest = ManifestSchema.parse(
    JSON.parse(readFileSync(`${PUBLIC_DATA_DIR}/manifest.json`, "utf8")),
  );
  if (manifest.batches.length && previous.contentMode !== "editorial") throw new Error("Editorial state is missing; refusing to replace published history");
  const coveredTitles = new Set(previous.coveredSourceTitles ?? []);
  const coveredUrls = new Set(previous.coveredSourceUrls ?? []);
  const collected = await collectSources(now, fetch, coveredUrls);
  const sources = collected.filter(
    (source) => !coveredUrls.has(source.url) && !coveredTitles.has(coverageTitle(source.title)),
  );
  console.log(`[sources] collected=${collected.length} unused=${sources.length} previouslyCovered=${collected.length - sources.length}`);
  if (!sources.length) {
    console.log("[editorial] No new usable sources; existing feed preserved.");
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Editorial generation\n\nTarget: ${EDITORIAL_MAX_POSTS}. Published: 0. No new usable sources; existing edition preserved.\n`);
    return;
  }
  const items = await generateEditorial(getApiKey(), sources, now, runId, previous.recentBatchSummaries.map((batch) => batch.summary), {
    onAcceptedChunk: audit?.onAcceptedChunk,
  });
  if (!items.length) {
    console.log("[editorial] No publishable posts; existing feed preserved.");
    return;
  }
  const nextWorld = makeEditorialWorld(previous, items, now, runId);
  const plan = buildPublishPlan({
    runId,
    now,
    items,
    accounts: editorialAccounts(now),
    accountsChanged: true,
    nextWorld,
    previousManifest: manifest,
  });
  publishWithAudit(audit, items.map(item => item.id), () => writePublishPlan(plan, {
    dataDir: PUBLIC_DATA_DIR,
    worldStatePath: WORLD_STATE_PATH,
  }));
  console.log(`[editorial] Published ${items.length} sourced posts.`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\nPublication complete: ${items.length} sourced posts written.\n`);
}
main().catch((error) => {
  console.error(
    `[editorial] ${error instanceof Error ? error.message : String(error)}`,
  );
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, "\nGeneration/publication failed; this job will not commit or deploy these local files. A candidate audit does not establish successful public-data writes. See redacted attempt logs for details.\n");
  process.exitCode = 1;
});
