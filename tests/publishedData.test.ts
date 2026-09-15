import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AccountsFileSchema,
  BatchFileSchema,
  ManifestSchema,
} from "../schemas";

describe("published world", () => {
  it("resolves every author and quoted post in every published batch", () => {
    const read = (file: string): unknown =>
      JSON.parse(readFileSync(`public/data/${file}`, "utf8"));
    const accounts = new Set(
      AccountsFileSchema.parse(read("accounts.json")).map((a) => a.id),
    );
    const manifest = ManifestSchema.parse(read("manifest.json"));
    for (const ref of manifest.batches) {
      const batch = BatchFileSchema.parse(read(ref.file));
      expect(batch.items.length).toBe(ref.itemCount);
      const posts = new Set(batch.items.map((i) => i.id));
      for (const item of batch.items) {
        expect(accounts.has(item.authorId), item.id).toBe(true);
        for (const c of item.comments)
          expect(accounts.has(c.authorId), c.id).toBe(true);
        if (item.referencedPostId)
          expect(posts.has(item.referencedPostId), item.id).toBe(true);
      }
    }
  });
});
