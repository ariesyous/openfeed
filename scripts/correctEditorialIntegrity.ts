import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import {
  BatchFileSchema, FeedItemSchema, ManifestSchema,
  type BatchFile, type Manifest,
} from "../schemas";
import { coverageTitle } from "../generator/editorial/coverage";
import { buildPublishPlan, writePublishPlan } from "../generator/publish";
import { WorldStateSchema, type WorldState } from "../generator/worldState";
import correctionRecord from "./fixtures/editorial-integrity-corrections-20260918.json";

/** Hash semantic JSON content independently of property order or indentation. */
export function contentHash(value: unknown): string {
  const canonical = JSON.stringify(value, (_key, current: unknown) => {
    if (current === null || typeof current !== "object" || Array.isArray(current)) return current;
    return Object.fromEntries(Object.entries(current).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export interface CorrectionSnapshot {
  manifest: Manifest;
  batches: BatchFile[];
  world: WorldState;
}

/** Four reviewed corrections only; an unexpected version fails before any write. */
export function buildEditorialCorrectionPlan(snapshot: CorrectionSnapshot) {
  const batches = structuredClone(snapshot.batches);
  const changedBatches = new Set<string>();
  const correctedPostIds: string[] = [];
  const nextWorld = structuredClone(snapshot.world);
  const urls = new Set(nextWorld.coveredSourceUrls ?? []);
  const titles = new Set(nextWorld.coveredSourceTitles ?? []);

  for (const correction of correctionRecord.corrections) {
    const before = FeedItemSchema.parse(correction.before);
    const after = FeedItemSchema.parse(correction.after);
    if (contentHash(before) !== correction.beforeSha256 || contentHash(after) !== correction.afterSha256)
      throw new Error(`Correction record hash mismatch: ${correction.postId}`);
    // A correction cannot migrate identity, placement, format or publication time.
    for (const key of ["id", "slug", "createdAt", "kind", "authorId", "community"] as const) {
      if (before[key] !== after[key]) throw new Error(`Correction changes ${key}: ${correction.postId}`);
    }
    if (before.id !== correction.postId || before.editorial?.format !== after.editorial?.format)
      throw new Error(`Correction identity/format mismatch: ${correction.postId}`);
    const matches = batches.flatMap(batch => batch.items
      .map((item, index) => ({ batch, item, index }))
      .filter(({ item }) => item.id === correction.postId));
    if (matches.length !== 1 || matches[0].batch.batchId !== correction.batchId)
      throw new Error(`Expected one published target in ${correction.batchId}: ${correction.postId}`);
    const { batch, item, index } = matches[0];
    const currentHash = contentHash(item);
    if (currentHash !== correction.afterSha256) {
      if (currentHash !== correction.beforeSha256)
        throw new Error(`Post changed since review; refusing to overwrite: ${correction.postId}`);
      batch.items[index] = after;
      changedBatches.add(batch.batchId);
      correctedPostIds.push(item.id);
    }
    // Retain old coverage; adding the replacement citation must not reopen either source.
    for (const source of [...(before.editorial?.sources ?? []), ...(after.editorial?.sources ?? [])]) {
      urls.add(source.url);
      titles.add(coverageTitle(source.title));
    }
  }
  nextWorld.coveredSourceUrls = [...urls];
  nextWorld.coveredSourceTitles = [...titles];
  if (!correctedPostIds.length && isDeepStrictEqual(nextWorld, snapshot.world))
    return { correctedPostIds, plan: undefined };

  const latest = batches.find(batch => batch.batchId === snapshot.manifest.latestRunId);
  if (!latest) throw new Error("Published latest batch is missing");
  const plan = buildPublishPlan({
    runId: latest.batchId,
    now: new Date(latest.generatedAt),
    items: latest.items,
    accounts: [],
    accountsChanged: false,
    nextWorld,
    previousManifest: snapshot.manifest,
    backfillBatches: batches.filter(batch => changedBatches.has(batch.batchId) && batch.batchId !== latest.batchId),
  });
  if (!isDeepStrictEqual(plan.manifest, snapshot.manifest))
    throw new Error("Correction would change publication catalog or dates");
  return { correctedPostIds, plan };
}

export function correctEditorialIntegrity(rootDir = process.cwd()) {
  const dataDir = path.join(rootDir, "public/data");
  const worldStatePath = path.join(rootDir, "generator/state/world.json");
  const readSnapshot = new Map<string, string>();
  const readJson = (filename: string): unknown => {
    const raw = readFileSync(filename, "utf8");
    readSnapshot.set(filename, raw);
    return JSON.parse(raw);
  };
  const manifest = ManifestSchema.parse(readJson(path.join(dataDir, "manifest.json")));
  const world = WorldStateSchema.parse(readJson(worldStatePath));
  const batches = manifest.batches.map(ref => BatchFileSchema.parse(readJson(path.join(dataDir, ref.file))));
  const result = buildEditorialCorrectionPlan({ manifest, world, batches });
  if (result.plan) {
    // Do not overwrite another local edit made while preparing the validated plan.
    for (const [filename, original] of readSnapshot) {
      if (readFileSync(filename, "utf8") !== original)
        throw new Error(`File changed during correction; retry after review: ${filename}`);
    }
    writePublishPlan(result.plan, { dataDir, worldStatePath });
  }
  return result.correctedPostIds;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const changed = correctEditorialIntegrity();
  console.log(changed.length
    ? `Corrected ${changed.length} reviewed posts without changing IDs, slugs or publication dates.`
    : "Reviewed corrections are already applied; no files changed.");
}
