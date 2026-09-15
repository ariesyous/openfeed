import { AccountSchema, FeedItemSchema, type Account, type Comment, type FeedItem } from "../schemas";
import {
  assignAges,
  pickIsViral,
  synthesizeCommentEngagement,
  synthesizeEngagement,
  type Rng,
} from "./engagement";
import { createIdGenerator } from "./ids";
import type { RawAdvanceWorldResponse, RawBootstrapResponse, RawFeedItem } from "./rawSchemas";

export interface EnrichBootstrapResult {
  accounts: Account[];
  idByHandle: Map<string, string>;
}

/** The sole place account ids/timestamps get generated for a bootstrap run. Every account
 * is re-validated against the shared AccountSchema before being returned, so a bug here
 * fails loudly rather than producing data the frontend can't read. */
export function enrichBootstrap(
  raw: RawBootstrapResponse,
  ctx: { runId: string; now: Date },
): EnrichBootstrapResult {
  const nextAccountId = createIdGenerator(`acc-${ctx.runId}`);
  const idByHandle = new Map<string, string>();
  for (const account of raw.accounts) {
    idByHandle.set(account.handle, nextAccountId());
  }

  const resolveAccountId = (handle: string): string => {
    const id = idByHandle.get(handle);
    if (!id) {
      throw new Error(
        `enrichBootstrap: unknown handle "${handle}" (should have been caught by ` +
          "validateRawBootstrapReferences)",
      );
    }
    return id;
  };

  const accounts: Account[] = raw.accounts.map((account, index) => {
    // Small spread so accounts don't all share one identical timestamp.
    const createdAt = new Date(ctx.now.getTime() - index * 60_000);

    return AccountSchema.parse({
      id: resolveAccountId(account.handle),
      handle: account.handle,
      displayName: account.displayName,
      bio: account.bio,
      personalityTraits: account.personalityTraits,
      interests: account.interests,
      writingStyle: account.writingStyle,
      communities: account.communities,
      behavioralTendencies: account.behavioralTendencies,
      relationships: account.relationships.map((r) => ({
        accountId: resolveAccountId(r.handle),
        type: r.type,
      })),
      activityLevel: account.activityLevel,
      createdAt: createdAt.toISOString(),
    });
  });

  return { accounts, idByHandle };
}

/** One short line per account (handle, top traits, activity, communities) -- kept compact
 * so the advance-world prompt stays bounded regardless of how many accounts exist. */
export function summarizeAccountsForPrompt(accounts: Account[]): string {
  return accounts
    .map((a) => {
      const traits = a.personalityTraits.slice(0, 3).join(", ");
      return `- @${a.handle} (${a.activityLevel} activity, in ${a.communities.join("/")}) -- ${traits}`;
    })
    .join("\n");
}

function buildMeta(rawItem: RawFeedItem): FeedItem["meta"] {
  if (rawItem.kind === "link_preview") {
    if (!rawItem.linkPreview) {
      throw new Error(
        `enrichAdvanceWorld: item "${rawItem.tempId}" of kind link_preview is missing ` +
          "linkPreview (should have been caught by validateRawAdvanceWorldReferences)",
      );
    }
    return {
      kind: "link_preview",
      url: rawItem.linkPreview.url,
      domain: rawItem.linkPreview.domain,
      linkTitle: rawItem.linkPreview.linkTitle,
      linkDescription: rawItem.linkPreview.linkDescription,
    };
  }
  if (rawItem.kind === "repost") return { kind: "repost" };
  if (rawItem.kind === "reaction") return { kind: "reaction" };
  return { kind: "generic" };
}

export interface EnrichAdvanceWorldResult {
  items: FeedItem[];
}

/** The sole place post/comment ids, timestamps, engagement, and `meta` get generated for
 * a normal cycle. Assumes `raw` already passed validateRawAdvanceWorldReferences -- any
 * reference that still fails to resolve here is treated as an internal assertion
 * failure (throw), not something to silently patch over. */
export function enrichAdvanceWorld(
  raw: RawAdvanceWorldResponse,
  ctx: { runId: string; now: Date; idByHandle: Map<string, string>; rng: Rng },
): EnrichAdvanceWorldResult {
  const nextPostId = createIdGenerator(`post-${ctx.runId}`);
  const nextCommentId = createIdGenerator(`cmt-${ctx.runId}`);

  const resolveAccountId = (handle: string): string => {
    const id = ctx.idByHandle.get(handle);
    if (!id) {
      throw new Error(
        `enrichAdvanceWorld: unknown authorHandle "${handle}" (should have been caught by ` +
          "validateRawAdvanceWorldReferences)",
      );
    }
    return id;
  };

  // Assign every item's and every comment's real id up front (across the whole flat
  // response) so any reference resolves regardless of array order.
  const postIdByTempId = new Map<string, string>();
  for (const item of raw.items) {
    postIdByTempId.set(item.tempId, nextPostId());
  }
  const commentIdByTempId = new Map<string, string>();
  for (const c of raw.comments) {
    commentIdByTempId.set(c.tempId, nextCommentId());
  }

  const commentsByPostTempId = new Map<string, typeof raw.comments>();
  for (const c of raw.comments) {
    const list = commentsByPostTempId.get(c.postTempId);
    if (list) list.push(c);
    else commentsByPostTempId.set(c.postTempId, [c]);
  }

  const createdAts = assignAges(
    ctx.rng,
    raw.items.map((i) => i.relativeAgeHint),
    ctx.now,
  );

  const items: FeedItem[] = raw.items.map((rawItem, index) => {
    const createdAt = createdAts[index];
    const ageHours = (ctx.now.getTime() - createdAt.getTime()) / 3_600_000;
    const isViral = pickIsViral(ctx.rng);

    const rawComments = commentsByPostTempId.get(rawItem.tempId) ?? [];
    const comments: Comment[] = rawComments.map((rawComment) => {
      let parentCommentId: string | undefined;
      if (rawComment.parentTempId) {
        parentCommentId = commentIdByTempId.get(rawComment.parentTempId);
        if (!parentCommentId) {
          throw new Error(
            `enrichAdvanceWorld: comment "${rawComment.tempId}" has a parentTempId that ` +
              "doesn't resolve (should have been caught by validateRawAdvanceWorldReferences)",
          );
        }
      }

      const commentCreatedAt = new Date(createdAt.getTime() + ctx.rng() * 2 * 3_600_000);

      return {
        id: commentIdByTempId.get(rawComment.tempId)!,
        authorId: resolveAccountId(rawComment.authorHandle),
        createdAt: commentCreatedAt.toISOString(),
        body: rawComment.body,
        parentCommentId,
        engagement: synthesizeCommentEngagement(ctx.rng, !!parentCommentId),
      };
    });

    let referencedPostId: string | undefined;
    if (rawItem.referencedTempId) {
      referencedPostId = postIdByTempId.get(rawItem.referencedTempId);
      if (!referencedPostId) {
        throw new Error(
          `enrichAdvanceWorld: item "${rawItem.tempId}" has a referencedTempId that doesn't ` +
            "resolve (should have been caught by validateRawAdvanceWorldReferences)",
        );
      }
    }

    return FeedItemSchema.parse({
      id: postIdByTempId.get(rawItem.tempId)!,
      kind: rawItem.kind,
      authorId: resolveAccountId(rawItem.authorHandle),
      createdAt: createdAt.toISOString(),
      community: rawItem.community,
      title: rawItem.title,
      body: rawItem.body,
      referencedPostId,
      meta: buildMeta(rawItem),
      engagement: synthesizeEngagement(ctx.rng, {
        kind: rawItem.kind,
        ageHours,
        isViral,
        replyCount: comments.length,
      }),
      comments,
    });
  });

  return { items };
}
