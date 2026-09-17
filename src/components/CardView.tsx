import { useEffect, useRef } from "react";
import type { FeedItem } from "../../schemas";
import { useCardDeck } from "../hooks/useCardDeck";
import { SwipeCard } from "./SwipeCard";

export function CardView({ active, onOpenArticle, onOpenTopic, onExit }: {
  active: boolean;
  onOpenArticle: (item: FeedItem) => void;
  onOpenTopic: (topic: string) => void;
  onExit: () => void;
}) {
  const deck = useCardDeck(active);
  const region = useRef<HTMLElement>(null);
  const disabled = deck.busy || Boolean(deck.error);
  useEffect(() => { if (active) region.current?.focus({ preventScroll: true }); }, [active]);
  useEffect(() => {
    if (!active) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        (event.target as Element).closest?.("input,textarea,select,[contenteditable='true']") || window.getSelection()?.toString()) return;
      if (event.key === "Escape") { onExit(); return; }
      if (disabled) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); deck.advance(event.key === "ArrowLeft" ? "different" : "next");
      } else if (event.key.toLowerCase() === "z" && deck.canUndo) { event.preventDefault(); deck.undo(); }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [active, disabled, deck, onExit]);

  return <section className="card-view" aria-label="Card mode — all topics" tabIndex={-1} ref={region}>
    <div className="card-view-heading">
      <span>{deck.revisiting ? "Revisiting · All topics" : "Discover · All topics"}</span>
      {deck.newPostCount > 0 && <button className="text-button" disabled={disabled} onClick={() => void deck.showNewPosts()}>{deck.newPostCount} new · Load</button>}
    </div>
    <div className="card-stage" aria-busy={deck.busy}>
      {deck.current && <SwipeCard key={deck.current.id} item={deck.current} active={active && !deck.busy && !deck.error && !deck.status} disabled={disabled}
        onAdvance={deck.advance} onOpenArticle={onOpenArticle} onOpenTopic={onOpenTopic} onPresented={deck.presented} />}
      {(!deck.current || deck.status || deck.error) && <div className="card-state" role="status">
        {deck.error ? <><p>{deck.error}</p><button onClick={deck.retry}>Try again</button></>
          : deck.status === "continue" ? <><p>There’s more of the archive to explore.</p><button onClick={deck.continueSearch}>Keep looking for unseen cards</button>{deck.current && <button onClick={deck.undo}>Cancel</button>}</>
          : deck.status === "no-alternative" ? <><p>No unseen cards from a different topic remain.</p><button onClick={() => deck.advance("next")}>Try next in this topic</button></>
          : deck.status === "exhausted" ? <><p>You’ve seen all available cards.</p><button onClick={deck.revisit}>Revisit articles</button><button onClick={onExit}>Return to feed</button></>
          : <p>Finding your next card…</p>}
      </div>}
    </div>
    <nav className="card-controls" aria-label="Card navigation">
      <button disabled={disabled || !deck.current} onClick={() => deck.advance("different")} title="Swipe left or press Left arrow">← Different topic</button>
      <button className="card-undo" disabled={disabled || !deck.canUndo} onClick={deck.undo} title="Undo last card (Z)">Undo</button>
      <button disabled={disabled || !deck.current} onClick={() => deck.advance("next")} title="Swipe right or press Right arrow">Next →</button>
    </nav>
    {deck.storageNotice && <p className="card-storage-notice" role="status">{deck.storageNotice}</p>}
  </section>;
}
