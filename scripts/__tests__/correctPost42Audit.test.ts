// @vitest-environment node
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BatchFileSchema, ManifestSchema } from "../../schemas";
import { buildPublishPlan, writePublishPlan } from "../../generator/publish";
import { WorldStateSchema } from "../../generator/worldState";
import { editorialVoiceIssues } from "../../generator/editorial/voice";
import { correctPost42Audit } from "../correctPost42Audit";
import record from "../fixtures/editorial-post42-corrections-20260918.json";

const repository = fileURLToPath(new URL("../../", import.meta.url));
let root: string;
const target = "public/data/batches/20260918T232533Z-bd16.json";
function files(): Record<string, string> {
  return Object.fromEntries(readdirSync(root, {recursive: true, withFileTypes: true})
    .filter(entry => entry.isFile()).map(entry => {
      const filename = path.join(entry.parentPath, entry.name);
      return [path.relative(root, filename), readFileSync(filename, "utf8")];
    }));
}
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "openfeed-post42-audit-"));
  cpSync(path.join(repository, "public/data"), path.join(root, "public/data"), {recursive: true});
  mkdirSync(path.join(root, "generator/state"), {recursive: true});
  cpSync(path.join(repository, "generator/state/world.json"), path.join(root, "generator/state/world.json"));
  const batch = BatchFileSchema.parse(JSON.parse(readFileSync(path.join(root, target), "utf8")));
  batch.items = batch.items.map(item => {
    const correction = record.corrections.find(row => row.postId === item.id);
    return correction ? BatchFileSchema.shape.items.element.parse(correction.before) : item;
  });
  writeFileSync(path.join(root, target), JSON.stringify(batch, null, 2) + "\n");
});
afterEach(() => rmSync(root, {recursive: true, force: true}));

describe("post-42 manual-edition corrections", () => {
  it("changes only the reviewed fields/posts while retaining every identity, source coverage and catalog date", () => {
    const before = files();
    expect(correctPost42Audit(root)).toEqual(record.corrections.map(row => row.postId));
    const after = files();
    expect(Object.keys(after)).toEqual(Object.keys(before));
    for (const name of Object.keys(before)) if (name !== target) expect(after[name], name).toBe(before[name]);
    const oldBatch = BatchFileSchema.parse(JSON.parse(before[target]));
    const batch = BatchFileSchema.parse(JSON.parse(after[target]));
    expect(batch.batchId).toBe(oldBatch.batchId);
    expect(batch.generatedAt).toBe(oldBatch.generatedAt);
    expect(batch.items).toHaveLength(oldBatch.items.length);
    batch.items.forEach((item, index) => {
      const original = oldBatch.items[index];
      const correction = record.corrections.find(row => row.postId === item.id);
      expect(item).toEqual(correction?.after ?? original);
      for (const key of ["id", "slug", "createdAt", "kind", "community", "authorId", "meta", "engagement", "comments"] as const)
        expect(item[key]).toEqual(original[key]);
      expect(item.editorial?.format).toBe(original.editorial?.format);
      expect(item.editorial?.spoilers).toBe(original.editorial?.spoilers);
      expect(editorialVoiceIssues({title: item.title ?? "", body: item.body,
        discussion: item.editorial?.discussion})).toEqual([]);
    });
    expect(batch.items[11].editorial?.discussion).toBeUndefined();
    expect(batch.items[11].body).toContain("not two directly comparable estimates");
    expect(batch.items[5].title).toBe("A Small Group of Inhibitory Neurons Can Send a Mouse to Sleep");
    expect(batch.items[9].body).not.toContain("largest body");
    // Useful valid discussion survives; these original blocks are not rewritten.
    for (const index of [0, 3, 6, 17])
      expect(batch.items[index].editorial?.discussion).toEqual(oldBatch.items[index].editorial?.discussion);
  });

  it("is idempotent without writes", () => {
    correctPost42Audit(root);
    const before = files();
    expect(correctPost42Audit(root)).toEqual([]);
    expect(files()).toEqual(before);
  });

  it("corrects the historical batch after a later edition lands without changing the newer publication", () => {
    const dataDir = path.join(root, "public/data");
    const worldStatePath = path.join(root, "generator/state/world.json");
    const manifest = ManifestSchema.parse(JSON.parse(readFileSync(path.join(dataDir, "manifest.json"), "utf8")));
    const world = WorldStateSchema.parse(JSON.parse(readFileSync(worldStatePath, "utf8")));
    const original = BatchFileSchema.parse(JSON.parse(readFileSync(path.join(root, target), "utf8"))).items[0];
    const now = new Date("2026-09-19T01:00:00.000Z");
    writePublishPlan(buildPublishPlan({runId: "later-edition-fixture", now,
      items: [{...original, id: "post-later-edition-fixture-0", slug: undefined, createdAt: now.toISOString()}],
      accounts: [], accountsChanged: false, nextWorld: world, previousManifest: manifest}),
    {dataDir, worldStatePath});
    const before = files();
    expect(correctPost42Audit(root)).toHaveLength(record.corrections.length);
    const after = files();
    for (const name of Object.keys(before)) if (name !== target) expect(after[name], name).toBe(before[name]);
    expect(JSON.parse(after["public/data/manifest.json"]).latestRunId).toBe("later-edition-fixture");
  });

  it("refuses a changed final target before writing any of the earlier corrections", () => {
    const batch = BatchFileSchema.parse(JSON.parse(readFileSync(path.join(root, target), "utf8")));
    batch.items[18].body += " A concurrent editorial change.";
    writeFileSync(path.join(root, target), JSON.stringify(batch));
    const before = files();
    expect(() => correctPost42Audit(root)).toThrow("Post changed since review; refusing to overwrite");
    expect(files()).toEqual(before);
  });
});
