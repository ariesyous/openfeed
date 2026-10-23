import { useEffect, useState } from "react";
import { useFeed } from "../hooks/useFeed";
import { markReady } from "../lib/ready";
import { PostCard } from "./PostCard";
import { PostCardCompact } from "./PostCardCompact";
import type { FeedItem } from "../../schemas";
import { TOPICS, topicLabel, topicPath, topicSlug } from "../../shared/topics";

const DENSITY_KEY = "cobanter-density";
type Density = "full" | "headlines";
function storedDensity(): Density {
  try { return localStorage.getItem(DENSITY_KEY) === "headlines" ? "headlines" : "full"; }
  catch { return "full"; }
}

export function FeedList({ community = "", onOpenTopic, onOpenArticle }: {
  community?: string;
  onOpenTopic?: (topic: string) => void;
  onOpenArticle?: (item: FeedItem) => void;
} = {}) {
  const { sentinelRef, ...feed } = useFeed(community);
  useEffect(() => { if (!feed.isLoadingInitial) markReady(); }, [feed.isLoadingInitial]);
  const [format, setFormat] = useState("");
  const [density, setDensity] = useState(storedDensity);
  const changeDensity = (value: Density) => {
    setDensity(value);
    try { localStorage.setItem(DENSITY_KEY, value); } catch { /* Device storage may be disabled. */ }
  };
  const itemsById = new Map(feed.items.map((i) => [i.id, i]));
  const visible = feed.items.filter(
    (i) =>
      (!format || i.editorial?.format === format) &&
      (!community || i.community === community),
  );
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
          <h1>{community ? topicLabel(community) : "Leave with something worth knowing."}</h1>
          <p>
            {community ? `News, stories, and ideas about ${topicLabel(community)}.` : "Fresh context, useful ideas, true stories, and a little back-and-forth."}
          </p>
        </div>
        <div className="feed-controls">
          {/* One row on phones: it scrolls sideways instead of wrapping above the first post. */}
          <div className="feed-control-row">
            <div className="format-tabs" role="group" aria-label="Reading format">
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
                  onClick={() => setFormat(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="density-switch" role="group" aria-label="Feed layout">
              <button aria-pressed={density === "full"} onClick={() => changeDensity("full")}>Full posts</button>
              <button aria-pressed={density === "headlines"} onClick={() => changeDensity("headlines")}>Headlines</button>
            </div>
          </div>
          <a className="feed-subscribe" href={community ? `${import.meta.env.BASE_URL}topics/${topicSlug(community)}/feed.xml` : `${import.meta.env.BASE_URL}feed.xml`}><span className="feed-subscribe-long">Follow {community ? topicLabel(community) : "CoBanter"} by</span> RSS</a>
        </div>
        {/* Always mounted so the arrival is announced; sticks under the header while reading. */}
        <div className="new-posts-bar" aria-live="polite">
          {feed.newPostCount > 0 && (
            <button
              className="new-posts"
              disabled={feed.isLoadingMore}
              onClick={() => void feed.showNewPosts()}
            >
              Show {feed.newPostCount} new posts
            </button>
          )}
        </div>
        <div className="feed-list">
          {visible.map((item) => density === "headlines" && item.editorial ? (
            <PostCardCompact key={item.id} item={item} onOpenArticle={onOpenArticle} onCommunityClick={onOpenTopic} />
          ) : (
            <PostCard
              key={item.id}
              item={item}
              onOpenArticle={onOpenArticle}
              accountsById={feed.accountsById}
              itemsById={itemsById}
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
