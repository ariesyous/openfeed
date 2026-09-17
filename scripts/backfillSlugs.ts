import { coverageTitle } from "../generator/editorial/coverage";
import { readFileSync } from "node:fs";
import { BatchFileSchema, ManifestSchema } from "../schemas";
import { buildPublishPlan, writePublishPlan } from "../generator/publish";
import { WorldStateSchema } from "../generator/worldState";
const dataDir = "public/data", worldStatePath = "generator/state/world.json";
const previousManifest = ManifestSchema.parse(JSON.parse(readFileSync(`${dataDir}/manifest.json`, "utf8")));
const batches = previousManifest.batches.map(ref => BatchFileSchema.parse(JSON.parse(readFileSync(`${dataDir}/${ref.file}`, "utf8"))));
const latest = batches[0];
if (!latest) throw new Error("No published batches to migrate");
const nextWorld = WorldStateSchema.parse(JSON.parse(readFileSync(worldStatePath, "utf8")));
nextWorld.coveredSourceUrls = [...new Set([...(nextWorld.coveredSourceUrls ?? []), ...batches.flatMap(batch => batch.items.flatMap(item => item.editorial?.sources.map(source => source.url) ?? []))])];
nextWorld.coveredSourceTitles = [...new Set([...(nextWorld.coveredSourceTitles ?? []), ...batches.flatMap(batch => batch.items.flatMap(item => item.editorial?.sources.map(source => coverageTitle(source.title)) ?? []))])];
const plan = buildPublishPlan({
  runId: latest.batchId, now: new Date(latest.generatedAt), items: latest.items,
  accounts: [], accountsChanged: false, nextWorld, previousManifest, backfillBatches: batches,
});
writePublishPlan(plan, { dataDir, worldStatePath });
console.log(`Backfilled ${batches.length} batches without changing publication dates.`);
