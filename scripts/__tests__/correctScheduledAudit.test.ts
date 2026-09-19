// @vitest-environment node
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, it } from "vitest";
import { correctScheduledAudit } from "../correctScheduledAudit";
import record from "../fixtures/editorial-scheduled-corrections-20260919.json";
import { BatchFileSchema, ManifestSchema } from "../../schemas";
import { WorldStateSchema } from "../../generator/worldState";
import { buildPublishPlan, writePublishPlan } from "../../generator/publish";

const repo = fileURLToPath(new URL("../../", import.meta.url));
let root: string;
const targets = new Set(record.corrections.map(c => `public/data/batches/${c.batchId}.json`));
const snapshot = () => Object.fromEntries(readdirSync(root, { recursive: true, withFileTypes: true })
  .filter(e => e.isFile()).map(e => [path.relative(root, path.join(e.parentPath, e.name)), readFileSync(path.join(e.parentPath, e.name), "utf8")]));
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "openfeed-scheduled-review-"));
  cpSync(path.join(repo, "public/data"), path.join(root, "public/data"), { recursive: true });
  mkdirSync(path.join(root, "generator/state"), { recursive: true });
  cpSync(path.join(repo, "generator/state/world.json"), path.join(root, "generator/state/world.json"));
  for (const file of targets) {
    const batch = JSON.parse(readFileSync(path.join(root, file), "utf8"));
    batch.items = batch.items.map((p: {id: string}) => record.corrections.find(c => c.postId === p.id)?.before ?? p);
    writeFileSync(path.join(root, file), JSON.stringify(batch, null, 2) + "\n");
  }
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
it("applies only exact reviewed changes across batches and is idempotent", () => {
  const before = snapshot();
  expect(correctScheduledAudit(root)).toEqual(record.corrections.map(c => c.postId));
  const after = snapshot();
  for (const file of Object.keys(before)) {
    if (!targets.has(file)) { expect(after[file], file).toBe(before[file]); continue; }
    const batch = JSON.parse(before[file]);
    batch.items = batch.items.map((p: {id: string}) => record.corrections.find(c => c.postId === p.id)?.after ?? p);
    expect(JSON.parse(after[file])).toEqual(batch);
  }
  for (const c of record.corrections) {
    for (const key of ["id", "slug", "createdAt", "community", "authorId"] as const)
      expect(c.after[key]).toBe(c.before[key]);
    expect(c.after.editorial.sources).toEqual(c.before.editorial.sources);
  }
  expect(correctScheduledAudit(root)).toEqual([]);
  expect(snapshot()).toEqual(after);
});
it("refuses a concurrent edit before writing any correction", () => {
  const last = record.corrections.at(-1)!;
  const file = path.join(root, `public/data/batches/${last.batchId}.json`);
  const batch = JSON.parse(readFileSync(file, "utf8"));
  batch.items.find((p: {id: string}) => p.id === last.postId).body += " Concurrent edit.";
  writeFileSync(file, JSON.stringify(batch));
  const before = snapshot();
  expect(() => correctScheduledAudit(root)).toThrow("Post changed since review; refusing to overwrite");
  expect(snapshot()).toEqual(before);
});

it("preserves a later edition and its catalog when correcting these older batches", () => {
  const dataDir = path.join(root, "public/data");
  const worldStatePath = path.join(root, "generator/state/world.json");
  const manifest = ManifestSchema.parse(JSON.parse(readFileSync(path.join(dataDir, "manifest.json"), "utf8")));
  const world = WorldStateSchema.parse(JSON.parse(readFileSync(worldStatePath, "utf8")));
  const original = BatchFileSchema.parse(JSON.parse(readFileSync(path.join(dataDir, manifest.batches[0].file), "utf8"))).items[0];
  const now = new Date("2026-09-20T00:00:00Z");
  writePublishPlan(buildPublishPlan({ runId: "scheduled-review-later-fixture", now,
    items: [{ ...original, id: "post-scheduled-review-later-fixture-0", slug: undefined, createdAt: now.toISOString() }],
    accounts: [], accountsChanged: false, nextWorld: world, previousManifest: manifest }), { dataDir, worldStatePath });
  const before = snapshot();
  expect(correctScheduledAudit(root)).toHaveLength(9);
  const after = snapshot();
  for (const file of Object.keys(before)) if (!targets.has(file)) expect(after[file], file).toBe(before[file]);
});
