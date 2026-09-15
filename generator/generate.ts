import { readFileSync } from "node:fs";
import path from "node:path";
import { AccountsFileSchema, ManifestSchema, type Account, type Manifest } from "../schemas";
import { runAdvanceWorld } from "./advanceWorld";
import { runBootstrap } from "./bootstrap";
import { PUBLIC_DATA_DIR, WORLD_STATE_PATH } from "./config";
import { getApiKey, loadEnvFile } from "./env";
import { createRunId } from "./ids";
import { buildPublishPlan, writePublishPlan } from "./publish";
import { loadWorldState, type WorldState } from "./worldState";

function loadAccounts(dataDir: string): Account[] {
  try {
    const raw = JSON.parse(readFileSync(path.join(dataDir, "accounts.json"), "utf8"));
    return AccountsFileSchema.parse(raw);
  } catch {
    return [];
  }
}

function loadManifestOrEmpty(dataDir: string, now: Date): Manifest {
  try {
    const raw = JSON.parse(readFileSync(path.join(dataDir, "manifest.json"), "utf8"));
    return ManifestSchema.parse(raw);
  } catch {
    return { schemaVersion: 1, generatedAt: now.toISOString(), latestRunId: "", batches: [] };
  }
}

function logAttempt(label: string) {
  return (info: { attempt: number; outcomeKind: string; detail?: string }): void => {
    const suffix = info.detail ? `: ${info.detail}` : "";
    console.log(`[generate] ${label} attempt ${info.attempt}: ${info.outcomeKind}${suffix}`);
  };
}

function logWarnings(warnings: string[]): void {
  for (const warning of warnings) console.warn(`[generate] warning: ${warning}`);
}

async function main(): Promise<void> {
  loadEnvFile();
  const apiKey = getApiKey();
  const runId = createRunId();
  const now = new Date();
  console.log(`[generate] run ${runId} starting`);

  const world = loadWorldState();
  const previousAccounts = world.initialized ? loadAccounts(PUBLIC_DATA_DIR) : [];
  const previousManifest = loadManifestOrEmpty(PUBLIC_DATA_DIR, now);

  let accounts: Account[];
  let idByHandle: Map<string, string>;
  let nextWorld: WorldState;
  let items;
  let accountsChanged = false;

  if (!world.initialized) {
    console.log("[generate] world not initialized -> running bootstrap");
    const boot = await runBootstrap({ apiKey, runId, now, onAttempt: logAttempt("bootstrap") });
    accounts = boot.accounts;
    idByHandle = boot.idByHandle;
    accountsChanged = true;
    console.log(
      `[generate] bootstrap succeeded in ${boot.attempts} attempt(s), model resolved: ${boot.modelUsed}`,
    );
    console.log(`[generate] bootstrap produced ${accounts.length} accounts`);

    const first = await runAdvanceWorld({
      apiKey,
      runId,
      now,
      accounts,
      world: boot.world,
      idByHandle,
      onAttempt: logAttempt("first-batch"),
      onWarnings: logWarnings,
    });
    items = first.items;
    nextWorld = first.nextWorld;
    console.log(
      `[generate] first batch succeeded in ${first.attempts} attempt(s), model resolved: ${first.modelUsed}`,
    );
  } else {
    accounts = previousAccounts;
    idByHandle = new Map(accounts.map((a) => [a.handle, a.id]));

    const adv = await runAdvanceWorld({
      apiKey,
      runId,
      now,
      accounts,
      world,
      idByHandle,
      onAttempt: logAttempt("advance-world"),
      onWarnings: logWarnings,
    });
    items = adv.items;
    nextWorld = adv.nextWorld;
    console.log(
      `[generate] advance-world succeeded in ${adv.attempts} attempt(s), model resolved: ${adv.modelUsed}`,
    );
  }

  const plan = buildPublishPlan({
    runId,
    now,
    items,
    accounts,
    accountsChanged,
    resetHistory: !world.initialized,
    nextWorld,
    previousManifest,
  });
  writePublishPlan(plan, { dataDir: PUBLIC_DATA_DIR, worldStatePath: WORLD_STATE_PATH });

  const totalComments = items.reduce((sum, item) => sum + item.comments.length, 0);
  console.log(
    `[generate] run ${runId} published: ${items.length} posts, ${totalComments} comments, ` +
      `${plan.manifest.batches.length} live batches (pruned ${plan.prunedBatches.length})`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[generate] FAILED: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
