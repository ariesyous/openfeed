import { existsSync, mkdirSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { EvidenceEntry } from "./evidence";
import type { SourcePacket } from "./sources";

export const AUDIT_FILE_NAME = "editorial-audit.json";
export const MAX_AUDIT_BYTES = 512 * 1024;
const id = z.string().min(1).max(256);
const evidenceId = z.string().min(1).max(40);
const evidenceIds = z.array(evidenceId).min(1).max(3);
const SourceSchema = z.object({
  id, url: z.string().max(4096).url().refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }),
  title: z.string().min(1).max(600), publisher: z.string().min(1).max(160),
  retrievedAt: z.string().datetime(), publishedAt: z.string().datetime().optional(),
  evergreen: z.boolean(),
}).strict();
const DiscussionOmissionSchema = z.enum(["schema", "unknown_evidence", "support_or_voice"]);
export type DiscussionOmissionReason = z.infer<typeof DiscussionOmissionSchema>;
const AuditChunkSchema = z.object({
  index: z.number().int().min(1).max(8),
  requestedModel: z.string().min(1).max(200), resolvedModel: z.string().min(1).max(200).nullable(),
  redactionsApplied: z.boolean(),
  sources: z.array(SourceSchema).min(1).max(12),
  evidence: z.array(z.object({ id: evidenceId, sourceId: id, quote: z.string().min(1).max(512) }).strict()).min(1).max(60),
  posts: z.array(z.object({
    postId: id, evidenceIds,
    discussionOmission: DiscussionOmissionSchema.optional(),
    discussion: z.array(z.object({
      turnIndex: z.number().int().min(0).max(3),
      voice: z.enum(["Take", "Pushback", "Reply", "Context"]), evidenceIds,
    }).strict()).max(4),
  }).strict()).min(1).max(4),
}).strict();
export type EditorialAuditChunk = z.infer<typeof AuditChunkSchema>;
export const EditorialAuditSchema = z.object({
  schemaVersion: z.literal(1), runId: id, startedAt: z.string().datetime(),
  // Neither status claims a Git commit, a push, or a successful Pages deployment.
  status: z.enum(["validated_candidate", "data_written"]),
  chunks: z.array(AuditChunkSchema).min(1).max(8),
}).strict().superRefine((audit, ctx) => {
  const posts = audit.chunks.flatMap(chunk => chunk.posts);
  if (posts.length > 20 || new Set(posts.map(post => post.postId)).size !== posts.length)
    ctx.addIssue({ code: "custom", message: "Invalid audit post count or duplicate post IDs" });
  audit.chunks.forEach((chunk, index) => {
    if (chunk.index !== index + 1) ctx.addIssue({ code: "custom", message: "Nonsequential audit chunks" });
    const sources = new Set(chunk.sources.map(source => source.id));
    const evidence = new Map(chunk.evidence.map(entry => [entry.id, entry]));
    if (sources.size !== chunk.sources.length || evidence.size !== chunk.evidence.length ||
      chunk.evidence.some(entry => !sources.has(entry.sourceId)))
      ctx.addIssue({ code: "custom", message: "Invalid audit evidence mapping" });
    for (const post of chunk.posts) {
      if (post.discussionOmission && post.discussion.length)
        ctx.addIssue({ code: "custom", message: "Omitted discussion cannot have published support" });
      const parentSources = new Set(post.evidenceIds.map(key => evidence.get(key)?.sourceId));
      if (post.evidenceIds.some(key => !evidence.has(key)) || post.discussion.some(turn =>
        turn.evidenceIds.some(key => !evidence.has(key) || !parentSources.has(evidence.get(key)!.sourceId))))
        ctx.addIssue({ code: "custom", message: "Invalid audit post support" });
    }
  });
});
type AuditSelection = {
  discussionOmission?: DiscussionOmissionReason;
  evidenceIds: string[];
  discussion?: { voice: string; evidenceIds: string[] }[] | null;
};

/** Only accepted selections, never full source packets, prompts or completions. */
export function buildAuditChunk(options: {
  index: number; runId: string; postOffset: number; requestedModel: string; resolvedModel: string | null; apiKey: string;
  posts: AuditSelection[]; evidenceById: ReadonlyMap<string, EvidenceEntry>; packets: SourcePacket[];
}): EditorialAuditChunk {
  let redactionsApplied = false;
  const scrub = (text: string, preserveWhitespace = false) => {
    const safe = (options.apiKey ? text.split(options.apiKey).join("[REDACTED]") : text)
      .replace(/Bearer\s+[^\s"',;]+/gi, "Bearer [REDACTED]")
      .replace(/sk-or-[\w-]+/g, "[REDACTED]")
      .replace(/\p{Cc}/gu, control => preserveWhitespace && /[\r\n\t]/.test(control) ? control : " ");
    if (safe !== text) redactionsApplied = true;
    return safe;
  };
  const selected = [...new Set(options.posts.flatMap(post => [
    ...post.evidenceIds, ...(post.discussion ?? []).flatMap(turn => turn.evidenceIds),
  ]))];
  const evidence = selected.map(key => {
    const entry = options.evidenceById.get(key);
    if (!entry || entry.quote.length > 300) throw new Error("Cannot audit an invalid evidence selection");
    return { id: key, sourceId: entry.sourceId, quote: scrub(entry.quote, true) };
  });
  const sources = [...new Set(evidence.map(entry => entry.sourceId))].map(sourceId => {
    const source = options.packets.find(packet => packet.id === sourceId);
    if (!source) throw new Error("Cannot audit a missing source");
    return {
      id: sourceId, url: scrub(source.url), title: scrub(source.title), publisher: scrub(source.publisher),
      retrievedAt: source.retrievedAt, publishedAt: source.publishedAt, evergreen: source.evergreen ?? false,
    };
  });
  const requestedModel = scrub(options.requestedModel);
  const resolvedModel = options.resolvedModel === null ? null : scrub(options.resolvedModel);
  const parsed = AuditChunkSchema.safeParse({
    index: options.index, requestedModel, resolvedModel, redactionsApplied, sources, evidence,
    posts: options.posts.map((post, index) => ({
      postId: `post-${options.runId}-${options.postOffset + index}`, evidenceIds: post.evidenceIds,
      discussionOmission: post.discussionOmission,
      discussion: (post.discussion ?? []).map((turn, turnIndex) => ({ turnIndex, voice: turn.voice, evidenceIds: turn.evidenceIds })),
    })),
  });
  // Avoid including values from untrusted metadata in errors or logs.
  if (!parsed.success) throw new Error("Editorial audit chunk exceeds bounds or has invalid metadata");
  return parsed.data;
}

export function serializeEditorialAudit(value: unknown): string {
  const parsed = EditorialAuditSchema.safeParse(value);
  if (!parsed.success) throw new Error("Editorial audit is invalid or exceeds record bounds");
  const serialized = JSON.stringify(parsed.data, null, 2) + "\n";
  if (Buffer.byteLength(serialized, "utf8") > MAX_AUDIT_BYTES)
    throw new Error("Editorial audit exceeds byte limit");
  return serialized;
}

function physicalPath(target: string): string {
  if (existsSync(target)) return realpathSync(target);
  return path.join(physicalPath(path.dirname(target)), path.basename(target));
}
function inside(target: string, directory: string): boolean {
  const relative = path.relative(directory, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

/** Explicit opt-in only. Audit write failure stops publication; no silent loss of support. */
export function createEditorialAudit(options: { directory: string; runId: string; now: Date; root?: string }) {
  const root = path.resolve(options.root ?? process.cwd());
  const directory = path.resolve(root, options.directory);
  if (["public", "dist", "dist-ssr"].some(name =>
    inside(directory, path.join(root, name)) || inside(physicalPath(directory), physicalPath(path.join(root, name)))))
    throw new Error("Editorial audits must remain outside public and build directories");
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, AUDIT_FILE_NAME);
  const temporary = `${file}.tmp`;
  // A local no-op/failure must never upload a previous run's artifact.
  rmSync(file, { force: true });
  rmSync(temporary, { force: true });
  const chunks: EditorialAuditChunk[] = [];
  let candidateRecorded = false;
  const write = (status: "validated_candidate" | "data_written") => {
    const serialized = serializeEditorialAudit({ schemaVersion: 1, runId: options.runId, startedAt: options.now.toISOString(), status, chunks });
    writeFileSync(temporary, serialized, { flag: "wx" });
    renameSync(temporary, file);
  };
  return {
    onAcceptedChunk(chunk: EditorialAuditChunk) {
      if (candidateRecorded || chunks.length >= 8) throw new Error("Editorial audit no longer accepts chunks");
      const parsed = AuditChunkSchema.safeParse(chunk);
      if (!parsed.success) throw new Error("Editorial audit chunk is invalid");
      chunks.push(parsed.data);
    },
    writeCandidate(postIds: string[]) {
      const auditedIds = chunks.flatMap(chunk => chunk.posts.map(post => post.postId));
      if (!postIds.length || JSON.stringify(postIds) !== JSON.stringify(auditedIds))
        throw new Error("Editorial audit does not match publication candidate");
      write("validated_candidate");
      candidateRecorded = true;
    },
    markDataWritten() {
      if (!candidateRecorded) throw new Error("Editorial audit candidate was not persisted");
      write("data_written");
    },
  };
}
export type EditorialAuditRecorder = ReturnType<typeof createEditorialAudit>;

export function publishWithAudit(audit: EditorialAuditRecorder | undefined, postIds: string[], publish: () => void): void {
  audit?.writeCandidate(postIds);
  publish(); // Preserve the original publish error and the candidate-only audit.
  audit?.markDataWritten();
}
