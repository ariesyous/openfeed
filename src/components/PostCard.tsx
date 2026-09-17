import { useState } from "react";
import { articlePath } from "../../shared/articles";
import type { Account, FeedItem } from "../../schemas";
import { formatRelativeTime } from "../lib/relativeTime";
import { Avatar } from "./Avatar";
import { CommentThread } from "./CommentThread";
import { EngagementBar } from "./EngagementBar";

interface PostCardProps {
  item: FeedItem;
  accountsById: Map<string, Account>;
  itemsById?: Map<string, FeedItem>;
  onOpenArticle?: (item: FeedItem) => void;
  onToggleSave?: (item: FeedItem) => void;
  onMarkRead?: (item: FeedItem) => void;
  saved?: boolean;
  isNew?: boolean;
  articleView?: boolean;
  onAuthorClick?: (id: string) => void;
  onCommunityClick?: (community: string) => void;
}

export function PostCard({
  item,
  accountsById,
  itemsById,
  onOpenArticle, onToggleSave, onMarkRead, saved, isNew, articleView,
  onAuthorClick,
  onCommunityClick,
}: PostCardProps) {
  const [expanded, setExpanded] = useState(Boolean(articleView));
  const [shareStatus, setShareStatus] = useState("");
  const url = articlePath(item, import.meta.env.BASE_URL);
  const [showSpoilers, setShowSpoilers] = useState(false);
  const discussion = item.editorial?.discussion ?? [];
  const hiddenSpoilers = item.editorial?.spoilers && !showSpoilers;
  const author = accountsById.get(item.authorId);
  const displayName = author?.displayName ?? (item.editorial ? "OpenFeed" : "Unknown");
  const handle = author?.handle ?? "unknown";
  const referenced = item.referencedPostId
    ? itemsById?.get(item.referencedPostId)
    : undefined;
  const preview = [...item.comments]
    .sort((a, b) => b.engagement.likes - a.engagement.likes)
    .find((c) => !c.parentCommentId);
  const hasComments = item.comments.length > 0;

  return (
    <article className={`post-card post-card--${item.kind}`} id={item.id}>
      {(item.kind === "repost" || item.kind === "reaction") && (
        <div className="post-kind">
          {item.kind === "repost" ? "↻ Reposted" : "↳ Reacting to a post"}
        </div>
      )}
      <header className="post-card-header">
        <Avatar
          seedKey={item.authorId}
          displayName={displayName}
          handle={handle}
        />
        <div className="post-card-author">
          {articleView ? <span className="post-card-display-name">{displayName}</span> : <button
            className="text-button post-card-display-name"
            onClick={() => onAuthorClick?.(item.authorId)}
          >
            {displayName}
          </button>}
          <span className="post-card-handle">
            {item.editorial ? "AI-edited column" : `@${handle}`}
          </span>
        </div>
        <span className="post-card-time">
          {formatRelativeTime(item.createdAt)}
        </span>
      </header>

      <div className="post-card-meta">
        {item.editorial && (
          <span
            className={`format-label format-label--${item.editorial.format}`}
          >
            {
              {
                news: "News",
                explainer: "Explained",
                story: "True story",
                banter: "Banter · Opinion",
              }[item.editorial.format]
            }
          </span>
        )}
        {articleView ? <span className="post-card-community">{item.community.replaceAll("_", " ")}</span> : <button
          className="post-card-community"
          onClick={() => onCommunityClick?.(item.community)}
        >
          {item.community.replaceAll("_", " ")}
        </button>}
      </div>

      {isNew && <span className="new-label">New since your last visit</span>}
      {item.title && (articleView ? <h1 className="post-card-title">{item.title}</h1> : <h3 className="post-card-title">{item.editorial ? <a href={url} onClick={(event) => {
        if (onOpenArticle && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
          event.preventDefault(); onOpenArticle(item);
        }
      }}>{item.title}</a> : item.title}</h3>)}
      {hiddenSpoilers ? (
        <button className="post-card-toggle" onClick={() => setShowSpoilers(true)}>Show spoilers</button>
      ) : <p className="post-card-body">{item.body}</p>}

      {!hiddenSpoilers && discussion.length > 0 && (
        <section className="editorial-discussion" aria-label="AI-generated discussion">
          <div className="source-panel-label">AI-generated discussion · Different perspectives</div>
          {(expanded ? discussion : discussion.slice(0, 1)).map((turn, index) => (
            <div className="editorial-discussion-turn" key={index}>
              <strong>{turn.voice}</strong><p>{turn.body}</p>
            </div>
          ))}
          <button type="button" className="post-card-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Hide discussion" : `Read discussion (${discussion.length})`}
          </button>
        </section>
      )}

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
            <div className="post-card-link-description">
              {item.meta.linkDescription}
            </div>
          )}
        </a>
      )}

      {item.referencedPostId && (
        <blockquote className="quoted-post">
          {referenced ? (
            <>
              <button
                className="text-button"
                onClick={() => onAuthorClick?.(referenced.authorId)}
              >
                {accountsById.get(referenced.authorId)?.displayName ??
                  "Unknown"}
              </button>
              {referenced.title && <strong>{referenced.title}</strong>}
              <p>{referenced.body}</p>
            </>
          ) : (
            <p>Original post is unavailable.</p>
          )}
        </blockquote>
      )}
      {item.editorial && <div className="reader-actions">
        {onToggleSave && <button type="button" aria-pressed={Boolean(saved)} onClick={() => onToggleSave(item)}>{saved ? "Saved" : "Save article"}</button>}
        {onMarkRead && <button type="button" onClick={() => onMarkRead(item)}>Mark read</button>}
        <button type="button" onClick={async () => {
          try { await navigator.clipboard.writeText(new URL(url, window.location.origin).href); setShareStatus("Link copied"); }
          catch { setShareStatus("Copy the article link from its title or address bar."); }
        }}>Copy link</button>
        <span role="status">{shareStatus}</span>
      </div>}
      {item.editorial ? (
        <div className="source-panel">
          <div className="source-panel-label">
            {item.editorial.format === "banter"
              ? "Generated commentary · Source context"
              : "Based on publisher excerpts"}
          </div>
          {item.editorial.sources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="source-link"
            >
              <span>{source.publisher} ↗</span>
              <span>{source.title}</span>
              {source.publishedAt ? <time dateTime={source.publishedAt}>
                Published{" "}
                {new Date(source.publishedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </time> : <span>Background reading · Publication date unavailable</span>}
            </a>
          ))}
        </div>
      ) : (
        <EngagementBar engagement={item.engagement} />
      )}

      {!expanded && preview && (
        <div className="comment-preview">
          <button
            className="text-button"
            onClick={() => onAuthorClick?.(preview.authorId)}
          >
            {accountsById.get(preview.authorId)?.displayName ?? "Unknown"}
          </button>
          <p>{preview.body}</p>
        </div>
      )}
      {hasComments ? (
        <button
          type="button"
          className="post-card-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded
            ? "Hide discussion"
            : `View discussion (${item.comments.length})`}
        </button>
      ) : (
        !item.editorial && (
          <div className="post-card-no-comments">No comments yet</div>
        )
      )}

      {expanded && hasComments && (
        <CommentThread
          comments={item.comments}
          accountsById={accountsById}
          onAuthorClick={onAuthorClick}
        />
      )}
    </article>
  );
}
