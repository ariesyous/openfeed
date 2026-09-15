import { z } from "zod";
import {
  ActivityLevelSchema,
  BehavioralTendenciesSchema,
  FeedItemKindSchema,
  RelationshipTypeSchema,
  WritingStyleSchema,
} from "../schemas";
import { BOOTSTRAP_MAX_ACCOUNTS, BOOTSTRAP_MIN_ACCOUNTS, MAX_GLOBAL_TRENDS } from "./config";

// The LLM must never invent ids, timestamps, or engagement counters
// (ProjectSpecifications.md §13) -- these "raw" schemas describe exactly what the model
// is asked to return: accounts/items reference each other by handle/tempId, and
// application code (generator/enrich.ts) is the sole source of real ids, createdAt
// values, and engagement numbers.

const StorylineStatusSchema = z.enum(["active", "escalating", "cooling", "resolved"]);
const ConflictHeatSchema = z.enum(["simmering", "active", "cooling"]);

export const RawAccountSchema = z.object({
  handle: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9_]+$/, "handle must be lowercase alphanumeric/underscore"),
  displayName: z.string().min(1).max(40),
  bio: z.string().max(200),
  personalityTraits: z.array(z.string().min(1)).min(1).max(8),
  interests: z.array(z.string().min(1)).min(1).max(10),
  writingStyle: WritingStyleSchema,
  communities: z.array(z.string().min(1)).min(1).max(6),
  behavioralTendencies: BehavioralTendenciesSchema,
  relationships: z
    .array(z.object({ handle: z.string().min(1), type: RelationshipTypeSchema }))
    .max(20),
  activityLevel: ActivityLevelSchema,
});
export type RawAccount = z.infer<typeof RawAccountSchema>;

const RawStorylineSeedSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(400),
  involvedHandles: z.array(z.string().min(1)).max(10),
});

export const RawBootstrapResponseSchema = z.object({
  accounts: z.array(RawAccountSchema).min(BOOTSTRAP_MIN_ACCOUNTS).max(BOOTSTRAP_MAX_ACCOUNTS),
  communities: z.array(z.string().min(1).max(40)).min(1).max(20),
  initialStorylines: z.array(RawStorylineSeedSchema).max(6).optional(),
});
export type RawBootstrapResponse = z.infer<typeof RawBootstrapResponseSchema>;

// Comments are a flat top-level array (see RawAdvanceWorldResponseSchema below), each
// carrying postTempId to say which item it belongs to, rather than nested inside each
// item -- live testing showed the 3-level-deep nested shape (response -> items ->
// comments) was a real reliability problem for weaker openrouter/free models, causing
// persistent invalid/empty responses even with a generous token/time budget. A flatter
// structure is a well-known LLM-friendliness pattern: less nesting to keep track of
// while generating.
export const RawCommentSchema = z.object({
  tempId: z.string().min(1),
  postTempId: z.string().min(1),
  authorHandle: z.string().min(1),
  body: z.string().min(1).max(2000),
  parentTempId: z.string().min(1).optional(),
});
export type RawComment = z.infer<typeof RawCommentSchema>;

const RawLinkPreviewSchema = z.object({
  url: z.string().url(),
  domain: z.string().min(1).max(100),
  linkTitle: z.string().min(1).max(200),
  linkDescription: z.string().max(400).optional(),
});

export const RawFeedItemSchema = z.object({
  tempId: z.string().min(1),
  kind: FeedItemKindSchema,
  authorHandle: z.string().min(1),
  community: z.string().min(1).max(40),
  title: z.string().min(1).max(150).optional(),
  body: z.string().min(1).max(4000),
  // Must match another item's tempId in this same response (never a historical batch)
  // -- see generator/publish.ts for why: it keeps age-based batch pruning safe by
  // construction, with no dangling referencedPostId possible. No ordering requirement
  // (doesn't have to be "earlier") -- enrich.ts resolves every item's real id up front
  // regardless of array position, so there's no need to burden the model with tracking
  // generation order.
  referencedTempId: z.string().min(1).optional(),
  linkPreview: RawLinkPreviewSchema.optional(),
  relativeAgeHint: z.enum(["fresh", "recent", "older"]).optional(),
});
export type RawFeedItem = z.infer<typeof RawFeedItemSchema>;

const RawTrendSchema = z.object({
  topic: z.string().min(1).max(80),
  community: z.string().min(1).max(40),
  strength: z.number().min(0).max(1),
});

export const RawWorldStateUpdateSchema = z.object({
  newStorylines: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        summary: z.string().min(1).max(400),
        involvedHandles: z.array(z.string().min(1)).max(10),
        status: StorylineStatusSchema,
      }),
    )
    .max(6),
  updatedStorylineIds: z
    .array(
      z.object({
        id: z.string().min(1),
        summary: z.string().min(1).max(400),
        status: StorylineStatusSchema,
      }),
    )
    .max(10),
  newRunningJokes: z
    .array(
      z.object({
        description: z.string().min(1).max(200),
        originHandles: z.array(z.string().min(1)).max(5),
      }),
    )
    .max(4),
  newConflicts: z
    .array(
      z.object({
        description: z.string().min(1).max(300),
        handles: z.array(z.string().min(1)).max(6),
        heat: ConflictHeatSchema,
      }),
    )
    .max(4),
  currentTrends: z.array(RawTrendSchema).max(MAX_GLOBAL_TRENDS),
  newMemoriesByHandle: z.record(z.string(), z.array(z.string().min(1).max(240))).optional(),
  cycleSummary: z.string().min(1).max(500),
});
export type RawWorldStateUpdate = z.infer<typeof RawWorldStateUpdateSchema>;

export const RawAdvanceWorldResponseSchema = z.object({
  items: z.array(RawFeedItemSchema).min(1).max(100),
  comments: z.array(RawCommentSchema).max(400),
  worldStateUpdate: RawWorldStateUpdateSchema,
});
export type RawAdvanceWorldResponse = z.infer<typeof RawAdvanceWorldResponseSchema>;

// --- Cross-reference checks Zod alone can't express (needs context) ---

/** Returns a list of human-readable problems; empty means the response is internally
 * consistent and ready for enrichment. Used both to reject a candidate and to compose
 * the retry-prompt correction message. */
export function validateRawBootstrapReferences(raw: RawBootstrapResponse): string[] {
  const issues: string[] = [];
  const handles = raw.accounts.map((a) => a.handle);
  const handleSet = new Set(handles);

  if (handleSet.size !== handles.length) {
    issues.push("duplicate account handles in the accounts list");
  }

  for (const account of raw.accounts) {
    for (const rel of account.relationships) {
      if (rel.handle === account.handle) {
        issues.push(`account "${account.handle}" has a relationship referencing itself`);
      } else if (!handleSet.has(rel.handle)) {
        issues.push(
          `account "${account.handle}" has a relationship referencing unknown handle "${rel.handle}"`,
        );
      }
    }
  }

  for (const storyline of raw.initialStorylines ?? []) {
    for (const handle of storyline.involvedHandles) {
      if (!handleSet.has(handle)) {
        issues.push(
          `initial storyline "${storyline.title}" references unknown handle "${handle}"`,
        );
      }
    }
  }

  return issues;
}

/** knownHandles = every account handle the generator currently knows about (i.e. all of
 * accounts.json, not just ones appearing in this response). No ordering requirements on
 * any reference (an item or comment may point to something appearing later in the same
 * response) -- enrich.ts resolves every tempId to a real id up front, so there's no
 * reason to make the model track generation order. */
export function validateRawAdvanceWorldReferences(
  raw: RawAdvanceWorldResponse,
  knownHandles: ReadonlySet<string>,
): string[] {
  const issues: string[] = [];
  const itemTempIds = new Set(raw.items.map((i) => i.tempId));

  if (itemTempIds.size !== raw.items.length) {
    issues.push("duplicate item tempId in items");
  }

  raw.items.forEach((item) => {
    if (!knownHandles.has(item.authorHandle)) {
      issues.push(`item "${item.tempId}" has unknown authorHandle "${item.authorHandle}"`);
    }
    if (item.referencedTempId) {
      if (item.referencedTempId === item.tempId || !itemTempIds.has(item.referencedTempId)) {
        issues.push(
          `item "${item.tempId}" has referencedTempId "${item.referencedTempId}" that does not ` +
            "match another item in this response",
        );
      }
    }
    if ((item.kind === "repost" || item.kind === "reaction") && !item.referencedTempId) {
      issues.push(`item "${item.tempId}" of kind "${item.kind}" is missing referencedTempId`);
    }
    if (item.kind === "link_preview" && !item.linkPreview) {
      issues.push(`item "${item.tempId}" of kind "link_preview" is missing linkPreview`);
    }
  });

  const commentTempIds = new Set<string>();
  const postTempIdByCommentTempId = new Map<string, string>();
  for (const comment of raw.comments) {
    if (commentTempIds.has(comment.tempId)) {
      issues.push(`duplicate comment tempId "${comment.tempId}"`);
    }
    commentTempIds.add(comment.tempId);
    postTempIdByCommentTempId.set(comment.tempId, comment.postTempId);

    if (!itemTempIds.has(comment.postTempId)) {
      issues.push(
        `comment "${comment.tempId}" has postTempId "${comment.postTempId}" that does not ` +
          "match any item in this response",
      );
    }
    if (!knownHandles.has(comment.authorHandle)) {
      issues.push(`comment "${comment.tempId}" has unknown authorHandle "${comment.authorHandle}"`);
    }
  }

  for (const comment of raw.comments) {
    if (!comment.parentTempId) continue;
    if (comment.parentTempId === comment.tempId || !commentTempIds.has(comment.parentTempId)) {
      issues.push(
        `comment "${comment.tempId}" has parentTempId "${comment.parentTempId}" that does not ` +
          "match another comment in this response",
      );
      continue;
    }
    if (postTempIdByCommentTempId.get(comment.parentTempId) !== comment.postTempId) {
      issues.push(
        `comment "${comment.tempId}" has parentTempId "${comment.parentTempId}" which belongs ` +
          "to a different post",
      );
    }
  }

  return issues;
}

/** Non-blocking sanity checks against the configured target sizes -- logged as warnings,
 * never rejected, since ProjectSpecifications.md §8.2 calls these targets, not hard limits. */
export function checkCycleSizeWarnings(
  raw: RawAdvanceWorldResponse,
  targets: { itemsPerCycle: number; commentsMin: number; commentsMax: number },
): string[] {
  const warnings: string[] = [];
  const totalComments = raw.comments.length;

  if (Math.abs(raw.items.length - targets.itemsPerCycle) > targets.itemsPerCycle * 0.5) {
    warnings.push(
      `item count ${raw.items.length} is far from the target ${targets.itemsPerCycle}`,
    );
  }
  if (totalComments < targets.commentsMin * 0.5 || totalComments > targets.commentsMax * 1.5) {
    warnings.push(
      `comment count ${totalComments} is far from the target range ` +
        `${targets.commentsMin}-${targets.commentsMax}`,
    );
  }

  return warnings;
}
