import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccountsFileSchema,
  BatchFileSchema,
  ManifestSchema,
  type Account,
  type BatchRef,
  type FeedItem,
  type Manifest,
} from "../../schemas";
import { dataUrl, manifestUrl } from "../lib/dataPaths";
import { rankBatch } from "../lib/ranking";

const MANIFEST_REFRESH_MS = 5 * 60_000;

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`${url} responded with ${response.status}`);
  }
  return response.json();
}

async function fetchManifest(signal: AbortSignal): Promise<Manifest> {
  return ManifestSchema.parse(await fetchJson(manifestUrl(), signal));
}

async function fetchAccounts(signal: AbortSignal): Promise<Account[]> {
  return AccountsFileSchema.parse(await fetchJson(dataUrl("accounts.json"), signal));
}

async function fetchBatchItems(batchRef: BatchRef, signal: AbortSignal): Promise<FeedItem[]> {
  const batch = BatchFileSchema.parse(await fetchJson(dataUrl(batchRef.file), signal));
  return batch.items;
}

export interface UseFeedResult {
  items: FeedItem[];
  accountsById: Map<string, Account>;
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  sentinelRef: (node: HTMLElement | null) => void;
}

export function useFeed(): UseFeedResult {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pendingBatches, setPendingBatches] = useState<BatchRef[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadedBatchIdsRef = useRef<Set<string>>(new Set());
  const oldestLoadedGeneratedAtRef = useRef<string | null>(null);
  const isLoadingMoreRef = useRef(false);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Initial load: manifest + accounts + the newest batch.
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const [manifest, accountsFile] = await Promise.all([
          fetchManifest(controller.signal),
          fetchAccounts(controller.signal),
        ]);
        setAccounts(accountsFile);

        const [newestBatch, ...rest] = manifest.batches;
        if (!newestBatch) {
          setIsLoadingInitial(false);
          return;
        }

        const batchItems = await fetchBatchItems(newestBatch, controller.signal);
        loadedBatchIdsRef.current.add(newestBatch.id);
        oldestLoadedGeneratedAtRef.current = newestBatch.generatedAt;
        setItems(rankBatch(batchItems));
        setPendingBatches(rest);
        setIsLoadingInitial(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load the feed.");
        setIsLoadingInitial(false);
      }
    })();

    return () => controller.abort();
  }, []);

  // Periodically refresh the manifest so a long-lived tab doesn't get stuck once it has
  // drained every batch known at page load. Only queues batches older than what's already
  // loaded, so scrolling down always continues toward older content.
  useEffect(() => {
    const interval = setInterval(async () => {
      const controller = new AbortController();
      try {
        const manifest = await fetchManifest(controller.signal);
        const oldestLoaded = oldestLoadedGeneratedAtRef.current;
        const newlyDiscovered = manifest.batches.filter(
          (batch) =>
            !loadedBatchIdsRef.current.has(batch.id) &&
            (!oldestLoaded || batch.generatedAt <= oldestLoaded),
        );
        if (newlyDiscovered.length > 0) {
          setPendingBatches((prev) => {
            const known = new Set(prev.map((b) => b.id));
            return [...prev, ...newlyDiscovered.filter((b) => !known.has(b.id))];
          });
        }
      } catch {
        // A background refresh failing is not user-visible; the next interval retries.
      }
    }, MANIFEST_REFRESH_MS);

    return () => clearInterval(interval);
  }, []);

  const loadMore = useCallback(() => {
    if (isLoadingMoreRef.current) return;
    setPendingBatches((prev) => {
      const [next, ...rest] = prev;
      if (!next) return prev;

      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
      const controller = new AbortController();

      fetchBatchItems(next, controller.signal)
        .then((batchItems) => {
          loadedBatchIdsRef.current.add(next.id);
          oldestLoadedGeneratedAtRef.current = next.generatedAt;
          setItems((current) => [...current, ...rankBatch(batchItems)]);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : "Failed to load more posts.");
        })
        .finally(() => {
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
        });

      return rest;
    });
  }, []);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            loadMore();
          }
        },
        { rootMargin: "600px" },
      );
      observerRef.current.observe(node);
    },
    [loadMore],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return {
    items,
    accountsById,
    isLoadingInitial,
    isLoadingMore,
    hasMore: pendingBatches.length > 0,
    error,
    sentinelRef,
  };
}
