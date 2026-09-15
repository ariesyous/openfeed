import { z } from "zod";

export const CommentEngagementSchema = z.object({
  likes: z.number().int().nonnegative(),
});
export type CommentEngagement = z.infer<typeof CommentEngagementSchema>;

export const CommentSchema = z.object({
  id: z.string().min(1),
  authorId: z.string().min(1),
  createdAt: z.string().datetime(),
  body: z.string().min(1).max(2000),
  parentCommentId: z.string().min(1).nullable().optional(),
  engagement: CommentEngagementSchema,
});
export type Comment = z.infer<typeof CommentSchema>;
