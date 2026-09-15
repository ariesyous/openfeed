import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Account, FeedItem } from "../schemas";
import { PostCard } from "../src/components/PostCard";

const account: Account = {
  id: "acc-test",
  handle: "test_handle",
  displayName: "Test Account",
  bio: "bio",
  personalityTraits: ["curious"],
  interests: ["testing"],
  writingStyle: {
    formality: 0.5,
    avgPostLength: "short",
    quirks: [],
    emojiUsage: "none",
  },
  communities: ["technology"],
  behavioralTendencies: {
    positivity: 0.5,
    controversialTake: 0.5,
    replyRate: 0.5,
  },
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
  engagement: {
    likes: 42,
    reposts: 3,
    replies: 1,
    views: 999,
    viralityScore: 0.2,
  },
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
  it("shows the original post for a reaction and opens profiles", () => {
    const onAuthorClick = vi.fn();
    const reaction: FeedItem = {
      ...item,
      id: "reaction",
      kind: "reaction",
      meta: { kind: "reaction" },
      body: "my reaction",
      referencedPostId: item.id,
      comments: [],
    };
    render(
      <PostCard
        item={reaction}
        accountsById={new Map([[account.id, account]])}
        itemsById={new Map([[item.id, item]])}
        onAuthorClick={onAuthorClick}
      />,
    );
    expect(screen.getByText(item.body)).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", { name: account.displayName })[0],
    );
    expect(onAuthorClick).toHaveBeenCalledWith(account.id);
  });

  it("renders author, body, and engagement", () => {
    render(
      <PostCard item={item} accountsById={new Map([[account.id, account]])} />,
    );

    expect(screen.getAllByText("Test Account")[0]).toBeInTheDocument();
    expect(screen.getByText("@test_handle")).toBeInTheDocument();
    expect(screen.getByText("hello from the test feed")).toBeInTheDocument();
    expect(screen.getByText("♥ 42")).toBeInTheDocument();
    expect(screen.getByText("View discussion (1)")).toBeInTheDocument();
  });

  it("falls back gracefully when the author is unknown", () => {
    render(<PostCard item={item} accountsById={new Map()} />);
    expect(screen.getAllByText("Unknown")[0]).toBeInTheDocument();
    expect(screen.getByText("@unknown")).toBeInTheDocument();
  });
});
