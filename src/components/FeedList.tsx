import { useRef, useState } from "react";
import { useFeed } from "../hooks/useFeed";
import { PostCard } from "./PostCard";
import { Avatar } from "./Avatar";
import type { FeedItem } from "../../schemas";
import { TOPICS, topicLabel, topicPath } from "../../shared/topics";

export function FeedList({ community = "", onOpenTopic, onOpenArticle }: {
  community?: string;
  onOpenTopic?: (topic: string) => void;
  onOpenArticle?: (item: FeedItem) => void;
} = {}) {
  const { sentinelRef, ...feed } = useFeed(community);
  const [format, setFormat] = useState("");
  const [authorId, setAuthorId] = useState("");
  const profileRef = useRef<HTMLElement>(null);
  const author = feed.accountsById.get(authorId);
  const itemsById = new Map(feed.items.map((i) => [i.id, i]));
  const visible = feed.items.filter(
    (i) =>
      (!format || i.editorial?.format === format) &&
      (!community || i.community === community) &&
      (!authorId || i.authorId === authorId),
  );
  const openProfile = (id: string) => {
    setAuthorId(id);
    setFormat("");
    requestAnimationFrame(() => {
      profileRef.current?.focus();
      profileRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };
  if (feed.isLoadingInitial)
    return (
      <div className="feed-status" role="status">
        Loading the feed…
      </div>
    );
  if (feed.error && !feed.items.length)
    return (
      <div className="feed-status" role="alert">
        {feed.error} <button onClick={feed.retryInitial}>Try again</button>
      </div>
    );
  return (
    <div className="feed-layout">
      <nav className="topic-navigation" aria-label="Topics">
        <h2>Topics</h2>
        <div className="topic-buttons">
          {["", ...[...TOPICS].sort()].map((topic) => (
            <a
              key={topic}
              href={topicPath(topic, import.meta.env.BASE_URL)}
              aria-current={community === topic ? "page" : undefined}
              onClick={(event) => {
                if (!onOpenTopic || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
                event.preventDefault();
                setAuthorId("");
                setFormat("");
                onOpenTopic(topic);
              }}
            >
              {topic ? topicLabel(topic) : "All topics"}
            </a>
          ))}
        </div>
      </nav>
      <div className="feed-content">
        <div className="feed-toolbar">
          <div>
            <h1>{community ? topicLabel(community) : "Leave with something worth knowing."}</h1>
            <p>
              {community ? `News, stories, and ideas about ${topicLabel(community)}.` : "Fresh context, useful ideas, true stories, and a little back-and-forth."}
            </p>
          </div>
        </div>
        {feed.newPostCount > 0 && (
          <button
            className="new-posts"
            disabled={feed.isLoadingMore}
            onClick={() => {
              setAuthorId("");
              void feed.showNewPosts();
            }}
          >
            Show {feed.newPostCount} new posts
          </button>
        )}
        {author && (
          <section
            className="profile-card"
            tabIndex={-1}
            ref={profileRef}
            aria-label={`${author.displayName}'s profile`}
          >
            <button className="text-button" onClick={() => setAuthorId("")}>
              ← Back to feed
            </button>
            <div className="profile-heading">
              <Avatar
                seedKey={author.id}
                displayName={author.displayName}
                handle={author.handle}
                size={56}
              />
              <div>
                <h2>{author.displayName}</h2>
                <span>@{author.handle}</span>
              </div>
            </div>
            <p>{author.bio}</p>
            <p className="profile-interests">{author.interests.join(" · ")}</p>
            <span className="profile-note">AI-edited column · Posts below</span>
          </section>
        )}
        <div className="format-tabs" aria-label="Reading format">
          {[
            ["", "All"],
            ["news", "News"],
            ["explainer", "Explained"],
            ["story", "Stories"],
            ["banter", "Banter"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={format === value}
              onClick={() => {
                setFormat(value);
                setAuthorId("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="feed-list">
          {visible.map((item) => (
            <PostCard
              key={item.id}
              item={item}
              onOpenArticle={onOpenArticle}
              accountsById={feed.accountsById}
              itemsById={itemsById}
              onAuthorClick={openProfile}
              onCommunityClick={onOpenTopic}
            />
          ))}
          {!visible.length && (
            <div className="feed-status">
              {feed.hasMore
                ? "No matching posts loaded yet. Explore older posts below."
                : "No posts here yet. Try another topic or return to the feed."}
            </div>
          )}
          {feed.error && (
            <div className="feed-status feed-status-error" role="alert">
              {feed.error}
            </div>
          )}
          {feed.hasMore && (
            <>
              <div
                ref={sentinelRef}
                className="feed-sentinel"
                aria-hidden="true"
              />
              <button
                className="load-more"
                disabled={feed.isLoadingMore}
                onClick={() => void feed.loadMore()}
              >
                {feed.isLoadingMore
                  ? "Loading…"
                  : feed.error
                    ? "Retry older posts"
                    : "Load older posts"}
              </button>
            </>
          )}
          {feed.isLoadingMore && (
            <div role="status" className="feed-status">
              Loading posts…
            </div>
          )}
          {!feed.hasMore && feed.items.length > 0 && (
            <div className="feed-status feed-status-end">
              You've reached the end. More to read when new sources arrive.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
