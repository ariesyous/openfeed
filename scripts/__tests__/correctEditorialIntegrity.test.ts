// @vitest-environment node
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BatchFileSchema, ManifestSchema } from "../../schemas";
import { WorldStateSchema } from "../../generator/worldState";
import { coverageTitle } from "../../generator/editorial/coverage";
import record from "../fixtures/editorial-integrity-corrections-20260918.json";
import { correctEditorialIntegrity } from "../correctEditorialIntegrity";

const repository = fileURLToPath(new URL("../../", import.meta.url));
let root: string;
const readJson = (filename: string) => JSON.parse(readFileSync(filename, "utf8"));
function allFiles(directory: string): Record<string, string> {
  return Object.fromEntries(readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => {
      const filename = path.join(entry.parentPath, entry.name);
      return [path.relative(directory, filename), readFileSync(filename, "utf8")];
    }));
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "openfeed-corrections-"));
  cpSync(path.join(repository, "public/data"), path.join(root, "public/data"), { recursive: true });
  mkdirSync(path.join(root, "generator/state"), { recursive: true });
  cpSync(path.join(repository, "generator/state/world.json"), path.join(root, "generator/state/world.json"));
  // Retain the whole surrounding catalog, including PR34, while replaying these four originals.
  for (const correction of record.corrections) {
    const filename = path.join(root, `public/data/batches/${correction.batchId}.json`);
    const batch = BatchFileSchema.parse(readJson(filename));
    batch.items = batch.items.map(item => item.id === correction.postId ? correction.before as typeof item : item);
    writeFileSync(filename, `${JSON.stringify(batch, null, 2)}\n`);
  }
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("reviewed editorial corrections", () => {
  it("changes only four reviewed posts and appends citation coverage without republishing the catalog", () => {
    const before = allFiles(root);
    const dataDir = path.join(root, "public/data");
    const manifest = ManifestSchema.parse(readJson(path.join(dataDir, "manifest.json")));
    const world = WorldStateSchema.parse(readJson(path.join(root, "generator/state/world.json")));
    expect(correctEditorialIntegrity(root)).toEqual(record.corrections.map(correction => correction.postId));
    const after = allFiles(root);
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
    expect(after["public/data/manifest.json"]).toBe(before["public/data/manifest.json"]);
    expect(after["public/data/accounts.json"]).toBe(before["public/data/accounts.json"]);
    for (const ref of manifest.batches) {
      const key = `public/data/${ref.file}`;
      const original = BatchFileSchema.parse(JSON.parse(before[key]));
      const corrected = BatchFileSchema.parse(JSON.parse(after[key]));
      expect(corrected.generatedAt).toBe(original.generatedAt);
      expect(corrected.batchId).toBe(original.batchId);
      expect(corrected.items).toHaveLength(original.items.length);
      original.items.forEach((item, index) => {
        const correction = record.corrections.find(candidate => candidate.postId === item.id);
        expect(corrected.items[index]).toEqual(correction ? correction.after : item);
        expect(corrected.items[index].slug).toBe(item.slug);
        expect(corrected.items[index].createdAt).toBe(item.createdAt);
      });
    }
    const nextWorld = WorldStateSchema.parse(readJson(path.join(root, "generator/state/world.json")));
    const replacement = record.corrections[0].after.editorial.sources[0];
    expect(nextWorld.coveredSourceUrls).toEqual([...new Set([...(world.coveredSourceUrls ?? []), replacement.url])]);
    expect(nextWorld.coveredSourceTitles).toEqual([...new Set([...(world.coveredSourceTitles ?? []), coverageTitle(replacement.title)])]);
    expect({ ...nextWorld, coveredSourceUrls: world.coveredSourceUrls, coveredSourceTitles: world.coveredSourceTitles }).toEqual(world);
    expect(record.corrections[0].after.editorial.format).toBe("explainer");
    expect(record.corrections[0].after.body).toContain("In March 2026");
  });

  it("does no writes when rerun after the reviewed corrections", () => {
    correctEditorialIntegrity(root);
    const before = allFiles(root);
    expect(correctEditorialIntegrity(root)).toEqual([]);
    expect(allFiles(root)).toEqual(before);
  });

  it.each(["body", "title", "discussion", "source"])("refuses a changed %s without partially correcting other posts", (field) => {
    // Change the last correction so earlier valid targets cannot have been written first.
    const correction = record.corrections.at(-1)!;
    const filename = path.join(root, `public/data/batches/${correction.batchId}.json`);
    const batch = BatchFileSchema.parse(readJson(filename));
    const item = batch.items.find(candidate => candidate.id === correction.postId)!;
    if (field === "body") item.body += " A concurrent edit.";
    if (field === "title") item.title += " revised";
    if (field === "discussion") item.editorial!.discussion![0].body += " A concurrent edit.";
    if (field === "source") item.editorial!.sources[0].url += "?revised=1";
    writeFileSync(filename, `${JSON.stringify(batch, null, 2)}\n`);
    const before = allFiles(root);
    expect(() => correctEditorialIntegrity(root)).toThrow("Post changed since review; refusing to overwrite");
    expect(allFiles(root)).toEqual(before);
  });
});
