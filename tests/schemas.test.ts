import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  AccountsFileSchema,
  BatchFileSchema,
  FeedItemSchema,
  ManifestSchema,
} from "../schemas";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(HERE, "../public/data");

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(DATA_DIR, relativePath), "utf8"));
}

const validAccount = {
  id: "acc-test",
  handle: "test_handle",
  displayName: "Test Account",
  bio: "just testing",
  personalityTraits: ["curious"],
  interests: ["testing"],
  writingStyle: {
    formality: 0.5,
    avgPostLength: "short" as const,
    quirks: [],
    emojiUsage: "none" as const,
  },
  communities: ["technology"],
  behavioralTendencies: {
    positivity: 0.5,
    controversialTake: 0.5,
    replyRate: 0.5,
  },
  relationships: [],
  activityLevel: "medium" as const,
  createdAt: new Date().toISOString(),
};

const validFeedItem = {
  id: "post-1",
  kind: "text_post" as const,
  authorId: "acc-test",
  createdAt: new Date().toISOString(),
  community: "technology",
  body: "hello world",
  meta: { kind: "generic" as const },
  engagement: {
    likes: 1,
    reposts: 0,
    replies: 0,
    views: 10,
    viralityScore: 0.1,
  },
  comments: [],
};

describe("AccountSchema (via AccountsFileSchema)", () => {
  it("accepts a well-formed account", () => {
    expect(AccountsFileSchema.safeParse([validAccount]).success).toBe(true);
  });

  it("rejects a handle with invalid characters", () => {
    const result = AccountsFileSchema.safeParse([
      { ...validAccount, handle: "Not Valid!" },
    ]);
    expect(result.success).toBe(false);
  });
});

describe("FeedItemSchema", () => {
  it("accepts a well-formed generic post", () => {
    expect(FeedItemSchema.safeParse(validFeedItem).success).toBe(true);
  });

  it("rejects a repost without referencedPostId", () => {
    const result = FeedItemSchema.safeParse({
      ...validFeedItem,
      kind: "repost",
      meta: { kind: "repost" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a link_preview item whose meta.kind does not match", () => {
    const result = FeedItemSchema.safeParse({
      ...validFeedItem,
      kind: "link_preview",
      meta: { kind: "generic" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects engagement.replies that disagrees with comments.length", () => {
    const result = FeedItemSchema.safeParse({
      ...validFeedItem,
      engagement: { ...validFeedItem.engagement, replies: 3 },
      comments: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a comment whose parentCommentId does not exist in the item", () => {
    const result = FeedItemSchema.safeParse({
      ...validFeedItem,
      engagement: { ...validFeedItem.engagement, replies: 1 },
      comments: [
        {
          id: "c1",
          authorId: "acc-test",
          createdAt: new Date().toISOString(),
          body: "reply",
          parentCommentId: "does-not-exist",
          engagement: { likes: 0 },
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("checked-in published data (public/data)", () => {
  it("accounts.json validates against AccountsFileSchema", () => {
    const result = AccountsFileSchema.safeParse(readJson("accounts.json"));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBeGreaterThan(0);
    }
  });

  it("manifest.json validates against ManifestSchema, newest batch first", () => {
    const result = ManifestSchema.safeParse(readJson("manifest.json"));
    expect(result.success).toBe(true);
    if (result.success) {
      const dates = result.data.batches.map((b) => b.generatedAt);
      const sorted = [...dates].sort().reverse();
      expect(dates).toEqual(sorted);
    }
  });

  it("every batch file validates against BatchFileSchema", () => {
    const batchDir = path.join(DATA_DIR, "batches");
    const files = readdirSync(batchDir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const result = BatchFileSchema.safeParse(
        JSON.parse(readFileSync(path.join(batchDir, file), "utf8")),
      );
      expect(
        result.success,
        `${file}: ${JSON.stringify(result.success ? null : result.error.issues)}`,
      ).toBe(true);
    }
  });
});
