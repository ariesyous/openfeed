import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
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
import { RETENTION_DAYS } from "./config";
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
}

export interface PublishPlan {
  batchFile: BatchFile;
  batchFileName: string;
  manifest: Manifest;
  accountsFile: AccountsFile | undefined;
  world: WorldState;
  prunedBatches: BatchRef[];
}

/**
 * Builds the full candidate publish (new batch, pruned manifest, accounts, world state)
 * entirely in memory and validates every piece before returning. Throws (via the
 * .parse() calls) rather than returning a partially-valid plan -- a candidate that
 * fails validation never reaches writePublishPlan, so nothing on disk is touched.
 *
 * Pruning tradeoff: batches older than RETENTION_DAYS are dropped by age alone, with no
 * attempt at full referential-integrity preservation across the retained set. This is
 * safe by construction because repost/reaction referencedPostId is restricted (at
 * generation time -- see generator/rawSchemas.ts) to items from the same cycle, never a
 * historical batch, so pruning an old batch can never leave a dangling reference in a
 * retained one. Continuity beyond the retention window lives in world-state summaries,
 * which the generator reads instead of re-reading old batch files.
 */
export function buildPublishPlan(candidate: PublishCandidate): PublishPlan {
  const batchFile = BatchFileSchema.parse({
    batchId: candidate.runId,
    generatedAt: candidate.now.toISOString(),
    items: candidate.items,
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

  const cutoffMs = candidate.now.getTime() - RETENTION_DAYS * 24 * 3_600_000;
  const retained = allBatches.filter(
    (b) => new Date(b.generatedAt).getTime() >= cutoffMs,
  );
  // Defensive: the batch just generated at `now` should never itself be past the cutoff,
  // but never let pruning remove every batch.
  if (!retained.some((b) => b.id === newBatchRef.id)) {
    retained.unshift(newBatchRef);
  }
  const retainedIds = new Set(retained.map((b) => b.id));
  const prunedBatches = history.filter((b) => !retainedIds.has(b.id));

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

  for (const batch of plan.prunedBatches) {
    const filePath = path.join(dirs.dataDir, batch.file);
    try {
      if (existsSync(filePath)) unlinkSync(filePath);
    } catch (err) {
      console.warn(
        `[publish] failed to delete pruned batch file ${filePath}: ${err}`,
      );
    }
  }
}
