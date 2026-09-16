import { readFileSync } from "node:fs";
import { ManifestSchema } from "../schemas";
import { PUBLIC_DATA_DIR, WORLD_STATE_PATH } from "./config";
import { getApiKey, loadEnvFile } from "./env";
import { createRunId } from "./ids";
import { buildPublishPlan, writePublishPlan } from "./publish";
import { loadWorldState } from "./worldState";
import { collectSources } from "./editorial/sources";
import { generateEditorial } from "./editorial/generate";
import { makeEditorialWorld } from "./editorial/state";
import { editorialAccounts } from "./editorial/accounts";

async function main() {
  loadEnvFile();
  const now = new Date(),
    runId = createRunId();
  const previous = loadWorldState();
  const manifest = ManifestSchema.parse(
    JSON.parse(readFileSync(`${PUBLIC_DATA_DIR}/manifest.json`, "utf8")),
  );
  const sources = (await collectSources(now)).filter(
    (source) => !previous.coveredSourceUrls?.includes(source.url),
  );
  if (!sources.length) {
    console.log("[editorial] No new usable sources; existing feed preserved.");
    return;
  }
  const items = await generateEditorial(getApiKey(), sources, now, runId, previous.recentBatchSummaries.map((batch) => batch.summary));
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
    resetHistory: previous.contentMode !== "editorial",
    nextWorld,
    previousManifest: manifest,
  });
  writePublishPlan(plan, {
    dataDir: PUBLIC_DATA_DIR,
    worldStatePath: WORLD_STATE_PATH,
  });
  console.log(`[editorial] Published ${items.length} sourced posts.`);
}
main().catch((error) => {
  console.error(
    `[editorial] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
