import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  AccountsFileSchema,
  BatchFileSchema,
  ManifestSchema,
  type Account,
  type AccountsFile,
  type BatchFile,
  type BatchRef,
  type FeedItem,
  type Manifest,
} from "../schemas";
import { withArticleSlug } from "../shared/articles";
import { WorldStateSchema, type WorldState } from "./worldState";

export interface PublishCandidate {
  runId: string;
  now: Date;
  items: FeedItem[];
  accounts: Account[];
  accountsChanged: boolean;
  resetHistory?: boolean;
  nextWorld: WorldState;
  previousManifest: Manifest;
  /** One-time validated slug backfill; original batch dates and IDs are preserved. */
  backfillBatches?: BatchFile[];
}

export interface PublishPlan {
  batchFile: BatchFile;
  batchFileName: string;
  manifest: Manifest;
  accountsFile: AccountsFile | undefined;
  world: WorldState;
  prunedBatches: BatchRef[];
  backfillBatches: BatchFile[];
}

/**
 * Builds the full candidate publish (new batch, pruned manifest, accounts, world state)
 * entirely in memory and validates every piece before returning. Throws (via the
 * .parse() calls) rather than returning a partially-valid plan -- a candidate that
 * fails validation never reaches writePublishPlan, so nothing on disk is touched.
 *
 * Published batches are retained forever. Deployment indexes are paginated at build time.
 */
export function buildPublishPlan(candidate: PublishCandidate): PublishPlan {
  const batchFile = BatchFileSchema.parse({
    batchId: candidate.runId,
    generatedAt: candidate.now.toISOString(),
    items: candidate.items.map(withArticleSlug),
  });

  const newBatchRef: BatchRef = {
    id: candidate.runId,
    generatedAt: batchFile.generatedAt,
    file: `batches/${candidate.runId}.json`,
    itemCount: batchFile.items.length,
  };

  const history = candidate.previousManifest.batches.filter(
    (b) => b.id !== newBatchRef.id,
  );
  const allBatches = [newBatchRef, ...(candidate.resetHistory ? [] : history)];

  // Content never expires. resetHistory only disconnects legacy fictional data;
  // it must not delete files. The active editorial generator never resets history.
  const retained = allBatches;
  const prunedBatches: BatchRef[] = [];

  const manifest = ManifestSchema.parse({
    schemaVersion: candidate.previousManifest.schemaVersion || 1,
    generatedAt: candidate.now.toISOString(),
    latestRunId: candidate.runId,
    batches: retained,
  });

  return {
    batchFile,
    batchFileName: `${candidate.runId}.json`,
    manifest,
    accountsFile: candidate.accountsChanged
      ? AccountsFileSchema.parse(candidate.accounts)
      : undefined,
    world: WorldStateSchema.parse(candidate.nextWorld),
    prunedBatches,
    backfillBatches: (candidate.backfillBatches ?? []).map((batch) =>
      BatchFileSchema.parse({ ...batch, items: batch.items.map(withArticleSlug) })),
  };
}

/** The only function in the generator allowed to write to public/data/* or
 * generator/state/world.json. Called only after buildPublishPlan has fully validated
 * the candidate. */
export function writePublishPlan(
  plan: PublishPlan,
  dirs: { dataDir: string; worldStatePath: string },
): void {
  const batchesDir = path.join(dirs.dataDir, "batches");
  mkdirSync(batchesDir, { recursive: true });

  for (const batch of plan.backfillBatches) {
    writeFileSync(path.join(batchesDir, `${batch.batchId}.json`), `${JSON.stringify(batch, null, 2)}\n`);
  }

  writeFileSync(
    path.join(batchesDir, plan.batchFileName),
    `${JSON.stringify(plan.batchFile, null, 2)}\n`,
  );
  writeFileSync(
    path.join(dirs.dataDir, "manifest.json"),
    `${JSON.stringify(plan.manifest, null, 2)}\n`,
  );
  if (plan.accountsFile) {
    writeFileSync(
      path.join(dirs.dataDir, "accounts.json"),
      `${JSON.stringify(plan.accountsFile, null, 2)}\n`,
    );
  }
  writeFileSync(
    dirs.worldStatePath,
    `${JSON.stringify(plan.world, null, 2)}\n`,
  );

}
