// @vitest-environment node
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BatchFileSchema } from "../../schemas";
import { editorialVoiceIssues } from "../../generator/editorial/voice";
import { correctFirstLiveAudit } from "../correctFirstLiveAudit";
import record from "../fixtures/editorial-first-live-corrections-20260918.json";

const repository = fileURLToPath(new URL("../../", import.meta.url));
let root: string;
const target = "public/data/batches/20260918T213919Z-f7d9.json";
function files(): Record<string, string> {
  return Object.fromEntries(readdirSync(root, {recursive: true, withFileTypes: true})
    .filter(entry => entry.isFile()).map(entry => {
      const filename = path.join(entry.parentPath, entry.name);
      return [path.relative(root, filename), readFileSync(filename, "utf8")];
    }));
}
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "openfeed-live-audit-"));
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

describe("first ordinary-edition corrections", () => {
  it("changes only the reviewed fields/posts while retaining every identity, source coverage and catalog date", () => {
    const before = files();
    expect(correctFirstLiveAudit(root)).toEqual(record.corrections.map(row => row.postId));
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
    // Both citations were already covered by this edition. No state mutation is needed.
    const world = JSON.parse(after["generator/state/world.json"]);
    for (const item of [oldBatch.items[2], batch.items[2]])
      expect(world.coveredSourceUrls).toContain(item.editorial!.sources[0].url);
    expect(batch.items[10].body).toContain("Econbrowser's author");
    expect(batch.items[4].body).toContain("separate federally commissioned survey of Jewish students");
  });

  it("is idempotent without writes", () => {
    correctFirstLiveAudit(root);
    const before = files();
    expect(correctFirstLiveAudit(root)).toEqual([]);
    expect(files()).toEqual(before);
  });

  it("refuses a changed final target before writing any of the earlier corrections", () => {
    const batch = BatchFileSchema.parse(JSON.parse(readFileSync(path.join(root, target), "utf8")));
    batch.items.at(-1)!.body += " A concurrent editorial change.";
    writeFileSync(path.join(root, target), JSON.stringify(batch));
    const before = files();
    expect(() => correctFirstLiveAudit(root)).toThrow("Post changed since review; refusing to overwrite");
    expect(files()).toEqual(before);
  });
});
