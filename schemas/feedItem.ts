import { z } from "zod";
import { CommentSchema } from "./comment";

export const FeedItemKindSchema = z.enum([
  "text_post",
  "question",
  "discussion",
  "hot_take",
  "observation",
  "personal_anecdote",
  "joke",
  "community_post",
  "announcement",
  "link_preview",
  "reaction",
  "repost",
]);
export type FeedItemKind = z.infer<typeof FeedItemKindSchema>;

/** Kinds that must carry a `referencedPostId` pointing at another feed item. */
export const REFERENCING_KINDS = ["repost", "reaction"] as const;

export const FeedItemMetaSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("generic") }),
  z.object({
    kind: z.literal("link_preview"),
    url: z.string().url(),
    domain: z.string().min(1).max(100),
    linkTitle: z.string().min(1).max(200),
    linkDescription: z.string().max(400).optional(),
  }),
  z.object({ kind: z.literal("repost") }),
  z.object({ kind: z.literal("reaction") }),
]);
export type FeedItemMeta = z.infer<typeof FeedItemMetaSchema>;

export const EngagementSchema = z.object({
  likes: z.number().int().nonnegative(),
  reposts: z.number().int().nonnegative(),
  replies: z.number().int().nonnegative(),
  views: z.number().int().nonnegative(),
  viralityScore: z.number().min(0).max(1),
});
export type Engagement = z.infer<typeof EngagementSchema>;

export const FeedSourceSchema = z.object({
  url: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://"), "Sources must use HTTPS"),
  title: z.string().min(1).max(300),
  publisher: z.string().min(1).max(80),
  publishedAt: z.string().datetime().optional(),
  retrievedAt: z.string().datetime(),
});
export type FeedSource = z.infer<typeof FeedSourceSchema>;

export const FeedItemSchema = z
  .object({
    editorial: z
      .object({
        format: z.enum(["news", "explainer", "story", "banter"]),
        sources: z.array(FeedSourceSchema).min(1).max(3),
        basis: z.literal("publisher_excerpt"),
        spoilers: z.boolean().optional(),
        discussion: z.array(z.object({
          voice: z.enum(["Take", "Pushback", "Reply", "Context"]),
          body: z.string().min(10).max(700),
        })).min(2).max(4).optional(),
      })
      .optional(),
    id: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*--[a-f0-9]+$/).optional(),
    kind: FeedItemKindSchema,
    authorId: z.string().min(1),
    createdAt: z.string().datetime(),
    community: z.string().min(1).max(40),
    title: z.string().min(1).max(150).optional(),
    body: z.string().min(1).max(4000),
    referencedPostId: z.string().min(1).optional(),
    meta: FeedItemMetaSchema,
    engagement: EngagementSchema,
    comments: z.array(CommentSchema).max(200),
  })
  .superRefine((item, ctx) => {
    const mustReference = (REFERENCING_KINDS as readonly string[]).includes(
      item.kind,
    );

    if (mustReference && !item.referencedPostId) {
      ctx.addIssue({
        code: "custom",
        path: ["referencedPostId"],
        message: `feed items of kind "${item.kind}" must set referencedPostId`,
      });
    }
    if (
      !mustReference &&
      item.kind !== "link_preview" &&
      item.referencedPostId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["referencedPostId"],
        message: `feed items of kind "${item.kind}" must not set referencedPostId`,
      });
    }

    const expectedMetaKind =
      mustReference || item.kind === "link_preview" ? item.kind : "generic";
    if (item.meta.kind !== expectedMetaKind) {
      ctx.addIssue({
        code: "custom",
        path: ["meta", "kind"],
        message: `meta.kind must be "${expectedMetaKind}" for a "${item.kind}" item, got "${item.meta.kind}"`,
      });
    }

    if (item.engagement.replies !== item.comments.length) {
      ctx.addIssue({
        code: "custom",
        path: ["engagement", "replies"],
        message: "engagement.replies must equal comments.length",
      });
    }

    const commentIds = new Set(item.comments.map((c) => c.id));
    if (commentIds.size !== item.comments.length) {
      ctx.addIssue({
        code: "custom",
        path: ["comments"],
        message: "duplicate comment id within feed item",
      });
    }
    for (const [index, comment] of item.comments.entries()) {
      if (comment.parentCommentId && !commentIds.has(comment.parentCommentId)) {
        ctx.addIssue({
          code: "custom",
          path: ["comments", index, "parentCommentId"],
          message: `parentCommentId "${comment.parentCommentId}" does not reference a comment in this item`,
        });
      }
    }
  });
export type FeedItem = z.infer<typeof FeedItemSchema>;

export const BatchFileSchema = z.object({
  batchId: z.string().min(1),
  generatedAt: z.string().datetime(),
  items: z.array(FeedItemSchema).min(1).max(100),
});
export type BatchFile = z.infer<typeof BatchFileSchema>;
