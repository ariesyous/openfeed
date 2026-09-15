import { useState } from "react";
import type { Account, FeedItem } from "../../schemas";
import { formatRelativeTime } from "../lib/relativeTime";
import { Avatar } from "./Avatar";
import { CommentThread } from "./CommentThread";
import { EngagementBar } from "./EngagementBar";

interface PostCardProps {
  item: FeedItem;
  accountsById: Map<string, Account>;
}

export function PostCard({ item, accountsById }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const author = accountsById.get(item.authorId);
  const displayName = author?.displayName ?? "Unknown";
  const handle = author?.handle ?? "unknown";
  const hasComments = item.comments.length > 0;

  return (
    <article className="post-card">
      <header className="post-card-header">
        <Avatar seedKey={item.authorId} displayName={displayName} handle={handle} />
        <div className="post-card-author">
          <span className="post-card-display-name">{displayName}</span>
          <span className="post-card-handle">@{handle}</span>
        </div>
        <span className="post-card-time">{formatRelativeTime(item.createdAt)}</span>
      </header>

      <div className="post-card-meta">
        <span className="post-card-community">{item.community}</span>
      </div>

      {item.title && <h3 className="post-card-title">{item.title}</h3>}
      <p className="post-card-body">{item.body}</p>

      {item.meta.kind === "link_preview" && (
        <a
          className="post-card-link-preview"
          href={item.meta.url}
          target="_blank"
          rel="noreferrer"
        >
          <div className="post-card-link-domain">{item.meta.domain}</div>
          <div className="post-card-link-title">{item.meta.linkTitle}</div>
          {item.meta.linkDescription && (
            <div className="post-card-link-description">{item.meta.linkDescription}</div>
          )}
        </a>
      )}

      <EngagementBar engagement={item.engagement} />

      {hasComments ? (
        <button
          type="button"
          className="post-card-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide discussion" : `View discussion (${item.comments.length})`}
        </button>
      ) : (
        <div className="post-card-no-comments">No comments yet</div>
      )}

      {expanded && hasComments && (
        <CommentThread comments={item.comments} accountsById={accountsById} />
      )}
    </article>
  );
}
