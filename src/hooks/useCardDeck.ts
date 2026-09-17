import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedItem } from "../../schemas";
import { persistSeenCards, readSeenCards, selectCard, type CardAction } from "../lib/cardSelection";
import { useFeed } from "./useFeed";

const SEARCH_BATCHES = 3;
type Search = { action: CardAction; remaining: number };
type Status = "searching" | "continue" | "exhausted" | "no-alternative" | null;

export function useCardDeck(active: boolean) {
  const feed = useFeed();
  const [current, setCurrent] = useState<FeedItem | null>(null);
  const [history, setHistory] = useState<FeedItem[]>([]);
  const [search, setSearch] = useState<Search | null>({ action: "next", remaining: SEARCH_BATCHES });
  const [status, setStatus] = useState<Status>("searching");
  const [storageNotice, setStorageNotice] = useState("");
  const [seen] = useState(() => {
    try { return readSeenCards(); } catch { return new Set<string>(); }
  });
  const [revisitSeen, setRevisitSeen] = useState<Set<string> | null>(null);
  const loading = useRef(false);
  const presented = useCallback((item: FeedItem) => {
    if (!active) return;
    revisitSeen?.add(item.id);
    if (seen.has(item.id)) return;
    seen.add(item.id);
    try { persistSeenCards(seen); }
    catch { setStorageNotice("Seen history is available for this visit only."); }
  }, [active, seen, revisitSeen]);

  // Reconcile a requested selection with newly loaded data. Only archive I/O lives
  // in the effect below; showing a card never starts another selection by itself.
  if (active && search && !feed.isLoadingInitial && !feed.isLoadingMore && !feed.error) {
    const candidate = selectCard(feed.items, revisitSeen ?? seen, current, search.action);
    if (candidate) {
      if (current) setHistory(previous => [...previous, current].slice(-30));
      setCurrent(candidate);
      setSearch(null); setStatus(null);
    } else if (!feed.hasMore) {
      setSearch(null);
      setStatus(search.action === "different" && current ? "no-alternative" : "exhausted");
    } else if (search.remaining === 0 && status !== "continue") setStatus("continue");
  }
  const { items, hasMore, isLoadingInitial, isLoadingMore, error, loadMore } = feed;
  useEffect(() => {
    if (!active || !search || search.remaining === 0 || loading.current || isLoadingInitial || isLoadingMore || error || !hasMore || selectCard(items, revisitSeen ?? seen, current, search.action)) return;
    loading.current = true;
    void loadMore().finally(() => {
      loading.current = false;
      setSearch(previous => previous === search ? { ...search, remaining: search.remaining - 1 } : previous);
    });
  }, [active, search, current, seen, revisitSeen, items, hasMore, isLoadingInitial, isLoadingMore, error, loadMore]);

  const advance = (action: CardAction) => {
    if (feed.isLoadingInitial || feed.isLoadingMore || loading.current) return;
    setSearch({ action, remaining: SEARCH_BATCHES }); setStatus("searching");
  };
  const undo = () => {
    if (loading.current || feed.isLoadingMore) return;
    setSearch(null); setStatus(null);
    if (search || !history.length) return;
    setCurrent(history[history.length - 1]); setHistory(history.slice(0, -1));
  };
  const revisit = () => {
    setRevisitSeen(new Set()); setCurrent(null); setHistory([]);
    setSearch({ action: "next", remaining: SEARCH_BATCHES }); setStatus("searching");
  };
  const retry = () => {
    if (feed.isLoadingInitial || feed.isLoadingMore || loading.current) return;
    if (!feed.items.length) feed.retryInitial();
    else {
      loading.current = true;
      void feed.loadMore().finally(() => {
        loading.current = false;
        setSearch(previous => previous ? { ...previous, remaining: SEARCH_BATCHES } : { action: "next", remaining: SEARCH_BATCHES });
      });
    }
    setStatus("searching");
  };
  const showNewPosts = async () => {
    setSearch(null); setStatus(null);
    await feed.showNewPosts();
    // A new edition must never displace the currently displayed card.
    if (!current) advance("next");
  };
  return {
    current, status, advance, undo, revisit, retry, presented, storageNotice,
    revisiting: Boolean(revisitSeen),
    canUndo: history.length > 0 || Boolean(current && search),
    busy: feed.isLoadingInitial || feed.isLoadingMore || status === "searching",
    error: feed.error, newPostCount: feed.newPostCount, showNewPosts,
    continueSearch: () => { setSearch(previous => previous ? { ...previous, remaining: SEARCH_BATCHES } : null); setStatus("searching"); },
  };
}
