import { useRef, useState } from "react";
import { useFeed } from "../hooks/useFeed";
import { PostCard } from "./PostCard";
import { Avatar } from "./Avatar";

export function FeedList() {
  const { sentinelRef, ...feed } = useFeed();
  const [community, setCommunity] = useState("");
  const [authorId, setAuthorId] = useState("");
  const profileRef = useRef<HTMLElement>(null);
  const author = feed.accountsById.get(authorId);
  const communities = [
    ...new Set([...feed.accountsById.values()].flatMap((a) => a.communities)),
  ].sort();
  const itemsById = new Map(feed.items.map((i) => [i.id, i]));
  const visible = feed.items.filter(
    (i) =>
      (!community || i.community === community) &&
      (!authorId || i.authorId === authorId),
  );
  const openProfile = (id: string) => {
    setAuthorId(id);
    setCommunity("");
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
    <>
      <div className="feed-toolbar">
        <div>
          <h1>Your window into another internet.</h1>
          <p>Familiar faces. Small dramas. Entirely fictional.</p>
        </div>
        <label>
          Explore a community
          <select
            value={community}
            onChange={(e) => {
              setCommunity(e.target.value);
              setAuthorId("");
            }}
          >
            <option value="">All communities</option>
            {communities.map((c) => (
              <option key={c} value={c}>
                {c.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>
      {feed.newPostCount > 0 && (
        <button
          className="new-posts"
          disabled={feed.isLoadingMore}
          onClick={() => {
            setAuthorId("");
            setCommunity("");
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
          <span className="profile-note">
            Fictional character · Posts below
          </span>
        </section>
      )}
      <div className="feed-list">
        {visible.map((item) => (
          <PostCard
            key={item.id}
            item={item}
            accountsById={feed.accountsById}
            itemsById={itemsById}
            onAuthorClick={openProfile}
            onCommunityClick={(c) => {
              setCommunity(c);
              setAuthorId("");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ))}
        {!visible.length && (
          <div className="feed-status">
            {feed.hasMore
              ? "No matching posts loaded yet. Explore older posts below."
              : "No posts here yet. Try another community or return to the feed."}
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
            You're caught up. This world has more stories to tell.
          </div>
        )}
      </div>
    </>
  );
}
