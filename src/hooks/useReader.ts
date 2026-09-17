import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import type { FeedItem } from "../../schemas";
import { articleSlug } from "../../shared/articles";

const KEY = "openfeed-reader-v1";
const SavedSchema = z.object({ id: z.string(), slug: z.string().regex(/^[a-z0-9-]+$/), title: z.string(), createdAt: z.string().datetime() });
const ReaderSchema = z.object({
  lastVisit: z.string().datetime().nullable(),
  readIds: z.array(z.string()).max(2000),
  saved: z.array(SavedSchema).max(500),
});
type ReaderState = z.infer<typeof ReaderSchema>;
export function readReaderState(): ReaderState {
  try { return ReaderSchema.parse(JSON.parse(localStorage.getItem(KEY) ?? "null")); }
  catch { return { lastVisit: null, readIds: [], saved: [] }; }
}

export function useReader() {
  const [state, setState] = useState(readReaderState);
  const [previousVisit, setPreviousVisit] = useState(state.lastVisit);
  const [visitStarted] = useState(() => new Date().toISOString());
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ ...state, lastVisit: state.lastVisit && state.lastVisit > visitStarted ? state.lastVisit : visitStarted })); }
    catch { /* Actions remain usable in memory; report storage status on explicit actions. */ }
  }, [state, visitStarted]);
  const persist = (next: ReaderState) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...next, lastVisit: next.lastVisit && next.lastVisit > visitStarted ? next.lastVisit : visitStarted }));
      setNotice("");
    } catch { setNotice("Browser storage is unavailable. Changes will last for this visit only."); }
  };
  const markRead = useCallback((item: FeedItem) => setState(current => current.readIds.includes(item.id) ? current : { ...current, readIds: [...current.readIds, item.id].slice(-2000) }), []);
  const toggleSave = (item: FeedItem) => {
    if (state.saved.some(saved => saved.id === item.id)) {
      persist({ ...state, saved: state.saved.filter(saved => saved.id !== item.id) });
    } else if (state.saved.length >= 500) {
      setNotice("Your 500 saved reads are safe. Unsave an item to make room for another.");
    } else {
      persist({ ...state, saved: [{ id: item.id, slug: articleSlug(item), title: item.title ?? "Article", createdAt: item.createdAt }, ...state.saved] });
    }
  };
  const markCaughtUp = () => {
    const now = new Date().toISOString();
    setPreviousVisit(now);
    persist({ ...state, lastVisit: now });
  };
  return { ...state, previousVisit, notice, markRead, toggleSave, markCaughtUp };
}
export type Reader = ReturnType<typeof useReader>;
