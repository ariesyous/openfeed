import { z } from "zod";

export const ActivityLevelSchema = z.enum(["low", "medium", "high"]);
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;

export const RelationshipTypeSchema = z.enum([
  "friend",
  "rival",
  "mutual",
  "fan",
  "blocked",
]);
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

export const RelationshipSchema = z.object({
  accountId: z.string().min(1),
  type: RelationshipTypeSchema,
});
export type Relationship = z.infer<typeof RelationshipSchema>;

export const WritingStyleSchema = z.object({
  formality: z.number().min(0).max(1),
  avgPostLength: z.enum(["short", "medium", "long", "variable"]),
  quirks: z.array(z.string().min(1)).max(10),
  emojiUsage: z.enum(["none", "rare", "occasional", "frequent"]),
});
export type WritingStyle = z.infer<typeof WritingStyleSchema>;

export const BehavioralTendenciesSchema = z.object({
  positivity: z.number().min(0).max(1),
  controversialTake: z.number().min(0).max(1),
  replyRate: z.number().min(0).max(1),
});
export type BehavioralTendencies = z.infer<typeof BehavioralTendenciesSchema>;

export const AccountSchema = z.object({
  id: z.string().min(1),
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
  relationships: z.array(RelationshipSchema).max(20),
  activityLevel: ActivityLevelSchema,
  createdAt: z.string().datetime(),
});
export type Account = z.infer<typeof AccountSchema>;

export const AccountsFileSchema = z.array(AccountSchema);
export type AccountsFile = z.infer<typeof AccountsFileSchema>;
