import { describe, expect, it } from "vitest";
import { AccountSchema, FeedItemSchema } from "../../schemas";
import { mulberry32 } from "../engagement";
import { enrichAdvanceWorld, enrichBootstrap, summarizeAccountsForPrompt } from "../enrich";
import type { RawAdvanceWorldResponse, RawBootstrapResponse } from "../rawSchemas";

const NOW = new Date("2026-09-15T12:00:00.000Z");

const rawBootstrap: RawBootstrapResponse = {
  accounts: [
    {
      handle: "alice_test",
      displayName: "Alice",
      bio: "hi",
      personalityTraits: ["curious"],
      interests: ["testing"],
      writingStyle: { formality: 0.5, avgPostLength: "short", quirks: [], emojiUsage: "none" },
      communities: ["technology"],
      behavioralTendencies: { positivity: 0.5, controversialTake: 0.2, replyRate: 0.5 },
      relationships: [{ handle: "bob_test", type: "friend" }],
      activityLevel: "medium",
    },
    {
      handle: "bob_test",
      displayName: "Bob",
      bio: "hey",
      personalityTraits: ["dry"],
      interests: ["testing"],
      writingStyle: { formality: 0.5, avgPostLength: "short", quirks: [], emojiUsage: "none" },
      communities: ["technology"],
      behavioralTendencies: { positivity: 0.5, controversialTake: 0.2, replyRate: 0.5 },
      relationships: [],
      activityLevel: "low",
    },
  ],
  communities: ["technology"],
};

describe("enrichBootstrap", () => {
  it("produces schema-valid accounts with resolved relationship ids", () => {
    const { accounts, idByHandle } = enrichBootstrap(rawBootstrap, { runId: "run1", now: NOW });

    expect(accounts).toHaveLength(2);
    for (const account of accounts) {
      expect(() => AccountSchema.parse(account)).not.toThrow();
    }

    const alice = accounts.find((a) => a.handle === "alice_test")!;
    expect(alice.relationships[0]?.accountId).toBe(idByHandle.get("bob_test"));
  });

  it("assigns unique ids per account", () => {
    const { accounts } = enrichBootstrap(rawBootstrap, { runId: "run1", now: NOW });
    const ids = accounts.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("summarizeAccountsForPrompt", () => {
  it("produces one compact line per account", () => {
    const { accounts } = enrichBootstrap(rawBootstrap, { runId: "run1", now: NOW });
    const summary = summarizeAccountsForPrompt(accounts);
    expect(summary.split("\n")).toHaveLength(2);
    expect(summary).toContain("@alice_test");
  });
});

describe("enrichAdvanceWorld", () => {
  const idByHandle = new Map([
    ["alice_test", "acc-1"],
    ["bob_test", "acc-2"],
  ]);

  it("produces schema-valid items with resolved comment/reference ids", () => {
    const raw: RawAdvanceWorldResponse = {
      items: [
        {
          tempId: "p1",
          kind: "text_post",
          authorHandle: "alice_test",
          community: "technology",
          body: "hello world",
        },
        {
          tempId: "p2",
          kind: "repost",
          authorHandle: "bob_test",
          community: "technology",
          body: "still thinking about this",
          referencedTempId: "p1",
        },
      ],
      comments: [
        { tempId: "c1", postTempId: "p1", authorHandle: "bob_test", body: "nice" },
        {
          tempId: "c2",
          postTempId: "p1",
          authorHandle: "alice_test",
          body: "thanks",
          parentTempId: "c1",
        },
      ],
      worldStateUpdate: {
        newStorylines: [],
        updatedStorylineIds: [],
        newRunningJokes: [],
        newConflicts: [],
        currentTrends: [],
        cycleSummary: "alice posted, bob reposted it",
      },
    };

    const { items } = enrichAdvanceWorld(raw, {
      runId: "run1",
      now: NOW,
      idByHandle,
      rng: mulberry32(42),
    });

    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(() => FeedItemSchema.parse(item)).not.toThrow();
    }

    const [post1, post2] = items;
    expect(post1.comments).toHaveLength(2);
    expect(post1.comments[1]!.parentCommentId).toBe(post1.comments[0]!.id);
    expect(post1.engagement.replies).toBe(2);

    expect(post2.kind).toBe("repost");
    expect(post2.referencedPostId).toBe(post1.id);
    expect(post2.meta).toEqual({ kind: "repost" });
  });

  it("builds link_preview meta from the raw linkPreview field", () => {
    const raw: RawAdvanceWorldResponse = {
      items: [
        {
          tempId: "p1",
          kind: "link_preview",
          authorHandle: "alice_test",
          community: "technology",
          body: "check this out",
          linkPreview: {
            url: "https://example.test/article",
            domain: "example.test",
            linkTitle: "A Title",
          },
        },
      ],
      comments: [],
      worldStateUpdate: {
        newStorylines: [],
        updatedStorylineIds: [],
        newRunningJokes: [],
        newConflicts: [],
        currentTrends: [],
        cycleSummary: "alice shared a link",
      },
    };

    const { items } = enrichAdvanceWorld(raw, {
      runId: "run1",
      now: NOW,
      idByHandle,
      rng: mulberry32(1),
    });

    expect(items[0]!.meta).toMatchObject({ kind: "link_preview", url: "https://example.test/article" });
  });

  it("throws rather than silently dropping a dangling parentTempId", () => {
    const raw: RawAdvanceWorldResponse = {
      items: [
        {
          tempId: "p1",
          kind: "text_post",
          authorHandle: "alice_test",
          community: "technology",
          body: "hello",
        },
      ],
      comments: [
        {
          tempId: "c1",
          postTempId: "p1",
          authorHandle: "bob_test",
          body: "orphaned",
          parentTempId: "does-not-exist",
        },
      ],
      worldStateUpdate: {
        newStorylines: [],
        updatedStorylineIds: [],
        newRunningJokes: [],
        newConflicts: [],
        currentTrends: [],
        cycleSummary: "test",
      },
    };

    expect(() =>
      enrichAdvanceWorld(raw, { runId: "run1", now: NOW, idByHandle, rng: mulberry32(1) }),
    ).toThrow(/parentTempId/);
  });

  it("resolves a referencedTempId pointing to a LATER item (no ordering requirement)", () => {
    const raw: RawAdvanceWorldResponse = {
      items: [
        {
          tempId: "p1",
          kind: "reaction",
          authorHandle: "alice_test",
          community: "technology",
          body: "lol yeah",
          referencedTempId: "p2",
        },
        {
          tempId: "p2",
          kind: "text_post",
          authorHandle: "bob_test",
          community: "technology",
          body: "posted this later in the array, referenced earlier",
        },
      ],
      comments: [],
      worldStateUpdate: {
        newStorylines: [],
        updatedStorylineIds: [],
        newRunningJokes: [],
        newConflicts: [],
        currentTrends: [],
        cycleSummary: "test",
      },
    };

    const { items } = enrichAdvanceWorld(raw, {
      runId: "run1",
      now: NOW,
      idByHandle,
      rng: mulberry32(1),
    });

    const [reaction, post] = items;
    expect(reaction.referencedPostId).toBe(post.id);
  });
});
