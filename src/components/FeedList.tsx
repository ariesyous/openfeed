import { useFeed } from "../hooks/useFeed";
import { PostCard } from "./PostCard";

export function FeedList() {
  const { items, accountsById, isLoadingInitial, isLoadingMore, hasMore, error, sentinelRef } =
    useFeed();

  if (isLoadingInitial) {
    return <div className="feed-status">Loading the feed…</div>;
  }

  if (error && items.length === 0) {
    return <div className="feed-status feed-status-error">Couldn't load the feed: {error}</div>;
  }

  return (
    <div className="feed-list">
      {items.map((item) => (
        <PostCard key={item.id} item={item} accountsById={accountsById} />
      ))}
      {hasMore && <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />}
      {isLoadingMore && <div className="feed-status">Loading more…</div>}
      {!hasMore && items.length > 0 && (
        <div className="feed-status feed-status-end">You've reached the end — for now.</div>
      )}
    </div>
  );
}
