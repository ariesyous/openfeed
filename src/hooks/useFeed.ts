import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccountsFileSchema,
  BatchFileSchema,
  ManifestSchema,
  type Account,
  type BatchRef,
  type FeedItem,
} from "../../schemas";
import { dataUrl, manifestUrl } from "../lib/dataPaths";
import { rankBatch } from "../lib/ranking";

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, cache: "no-cache" });
  if (!response.ok)
    throw new Error("The feed couldn't be loaded. Please try again.");
  return response.json();
}
async function fetchBatch(batch: BatchRef, signal: AbortSignal) {
  return rankBatch(
    BatchFileSchema.parse(await fetchJson(dataUrl(batch.file), signal)).items,
  );
}

export function useFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pending, setPending] = useState<BatchRef[]>([]);
  const [fresh, setFresh] = useState<BatchRef[]>([]);
  const [isLoadingInitial, setInitial] = useState(true);
  const [isLoadingMore, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const loaded = useRef(new Set<string>());
  const newest = useRef<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    async function initialize() {
      try {
        const [manifestData, accountData] = await Promise.all([
          fetchJson(manifestUrl(), abort.signal),
          fetchJson(dataUrl("accounts.json"), abort.signal),
        ]);
        const manifest = ManifestSchema.parse(manifestData);
        const accountsFile = AccountsFileSchema.parse(accountData);
        const [first, ...rest] = manifest.batches;
        const batchItems = first ? await fetchBatch(first, abort.signal) : [];
        if (abort.signal.aborted) return;
        loaded.current = new Set(first ? [first.id] : []);
        newest.current = first?.generatedAt ?? manifest.generatedAt;
        setAccounts(accountsFile);
        setItems(batchItems);
        setPending(rest);
        setFresh([]);
        setError(null);
      } catch {
        if (!abort.signal.aborted)
          setError("The feed couldn't be loaded. Please try again.");
      } finally {
        if (!abort.signal.aborted) setInitial(false);
      }
    }
    void initialize();
    const interval = setInterval(async () => {
      if (!newest.current || busy.current) return;
      try {
        const manifest = ManifestSchema.parse(
          await fetchJson(manifestUrl(), abort.signal),
        );
        if (!abort.signal.aborted)
          setFresh(
            manifest.batches.filter(
              (b) =>
                !loaded.current.has(b.id) && b.generatedAt > newest.current!,
            ),
          );
      } catch {
        /* Keep the current feed when a background check fails. */
      }
    }, 5 * 60_000);
    return () => {
      abort.abort();
      clearInterval(interval);
    };
  }, [attempt]);

  const loadMore = useCallback(async () => {
    const next = pending[0];
    const abort = controller.current;
    if (!next || busy.current || !abort || abort.signal.aborted) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const batchItems = await fetchBatch(next, abort.signal);
      if (abort.signal.aborted) return;
      loaded.current.add(next.id);
      setItems((current) => [
        ...current,
        ...batchItems.filter((i) => !current.some((p) => p.id === i.id)),
      ]);
      setPending((current) => current.filter((b) => b.id !== next.id));
    } catch {
      if (!abort.signal.aborted)
        setError("Couldn't load older posts. Your place is saved.");
    } finally {
      busy.current = false;
      if (!abort.signal.aborted) setLoading(false);
    }
  }, [pending]);

  const showNewPosts = async () => {
    const abort = controller.current;
    if (!fresh.length || busy.current || !abort) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const [accountData, batches] = await Promise.all([
        fetchJson(dataUrl("accounts.json"), abort.signal),
        Promise.all(fresh.map((b) => fetchBatch(b, abort.signal))),
      ]);
      const accountsFile = AccountsFileSchema.parse(accountData);
      if (abort.signal.aborted) return;
      fresh.forEach((b) => loaded.current.add(b.id));
      newest.current = fresh[0].generatedAt;
      setAccounts(accountsFile);
      setItems((current) =>
        [...batches.flat(), ...current].filter(
          (item, index, all) =>
            all.findIndex((i) => i.id === item.id) === index,
        ),
      );
      setFresh([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      if (!abort.signal.aborted)
        setError("Couldn't load new posts. Please try again.");
    } finally {
      busy.current = false;
      if (!abort.signal.aborted) setLoading(false);
    }
  };
  const observer = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observer.current?.disconnect();
      if (
        !node ||
        error ||
        isLoadingMore ||
        !("IntersectionObserver" in window)
      )
        return;
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) void loadMore();
        },
        { rootMargin: "600px" },
      );
      observer.current.observe(node);
    },
    [loadMore, error, isLoadingMore],
  );
  useEffect(() => () => observer.current?.disconnect(), []);
  const retryInitial = () => {
    setInitial(true);
    setError(null);
    setAttempt((n) => n + 1);
  };
  return {
    items,
    accountsById: useMemo(
      () => new Map(accounts.map((a) => [a.id, a])),
      [accounts],
    ),
    isLoadingInitial,
    isLoadingMore,
    hasMore: pending.length > 0,
    error,
    sentinelRef,
    loadMore,
    retryInitial,
    showNewPosts,
    newPostCount: fresh.reduce((n, b) => n + b.itemCount, 0),
  };
}
