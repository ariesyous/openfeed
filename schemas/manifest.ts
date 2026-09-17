import { z } from "zod";

export const BatchRefSchema = z.object({
  id: z.string().min(1),
  generatedAt: z.string().datetime(),
  file: z.string().min(1),
  itemCount: z.number().int().positive(),
});
export type BatchRef = z.infer<typeof BatchRefSchema>;

export const ManifestSchema = z.object({
  schemaVersion: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  latestRunId: z.string().min(1),
  batches: z.array(BatchRefSchema),
  olderManifest: z.string().regex(/^archive\/page-[a-zA-Z0-9_-]+\.json$/).optional(),
});
export type Manifest = z.infer<typeof ManifestSchema>;
