import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Account, FeedItem } from "../schemas";
import { PostCard } from "../src/components/PostCard";

const account: Account = {
  id: "acc-test",
  handle: "test_handle",
  displayName: "Test Account",
  bio: "bio",
  personalityTraits: ["curious"],
  interests: ["testing"],
  writingStyle: { formality: 0.5, avgPostLength: "short", quirks: [], emojiUsage: "none" },
  communities: ["technology"],
  behavioralTendencies: { positivity: 0.5, controversialTake: 0.5, replyRate: 0.5 },
  relationships: [],
  activityLevel: "medium",
  createdAt: new Date().toISOString(),
};

const item: FeedItem = {
  id: "post-1",
  kind: "text_post",
  authorId: "acc-test",
  createdAt: new Date().toISOString(),
  community: "technology",
  body: "hello from the test feed",
  meta: { kind: "generic" },
  engagement: { likes: 42, reposts: 3, replies: 1, views: 999, viralityScore: 0.2 },
  comments: [
    {
      id: "c1",
      authorId: "acc-test",
      createdAt: new Date().toISOString(),
      body: "a reply",
      engagement: { likes: 1 },
    },
  ],
};

describe("PostCard", () => {
  it("renders author, body, and engagement", () => {
    render(<PostCard item={item} accountsById={new Map([[account.id, account]])} />);

    expect(screen.getByText("Test Account")).toBeInTheDocument();
    expect(screen.getByText("@test_handle")).toBeInTheDocument();
    expect(screen.getByText("hello from the test feed")).toBeInTheDocument();
    expect(screen.getByText("♥ 42")).toBeInTheDocument();
    expect(screen.getByText("View discussion (1)")).toBeInTheDocument();
  });

  it("falls back gracefully when the author is unknown", () => {
    render(<PostCard item={item} accountsById={new Map()} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("@unknown")).toBeInTheDocument();
  });
});
