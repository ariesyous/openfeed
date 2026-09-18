import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import type { FeedItem } from "../../schemas";
import { articlePath } from "../../shared/articles";
import { topicLabel, topicPath } from "../../shared/topics";
import type { CardAction } from "../lib/cardSelection";
import { fitCardText } from "../lib/fitCardText";
import { PublicationDate } from "./PublicationDate";

interface Props {
  item: FeedItem;
  active: boolean;
  disabled: boolean;
  onAdvance: (action: CardAction) => void;
  onOpenArticle: (item: FeedItem) => void;
  onOpenTopic: (topic: string) => void;
  onPresented: (item: FeedItem) => void;
}

export function SwipeCard({ item, active, disabled, onAdvance, onOpenArticle, onOpenTopic, onPresented }: Props) {
  const [spoilers, setSpoilers] = useState(false);
  const [fits, setFits] = useState(true);
  const [drag, setDrag] = useState(0);
  const reading = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; horizontal: boolean } | null>(null);
  const suppressClickUntil = useRef(0);
  const hiddenSpoilers = item.editorial?.spoilers && !spoilers;
  const href = articlePath(item, import.meta.env.BASE_URL);

  useLayoutEffect(() => {
    if (!active) return;
    const measure = () => {
      if (!reading.current || !copy.current) return;
      const available = reading.current;
      const content = copy.current;
      const fitsNow = fitCardText(content, available);
      setFits(fitsNow);
      if (fitsNow && available.clientHeight > 0 && document.visibilityState !== "hidden") onPresented(item);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (reading.current) observer?.observe(reading.current);
    if (copy.current) observer?.observe(copy.current);
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); document.removeEventListener("visibilitychange", measure); };
  }, [active, item, hiddenSpoilers, onPresented]);

  const cancel = () => { pointer.current = null; setDrag(0); };
  const start = (event: PointerEvent<HTMLElement>) => {
    if (!event.isPrimary) { cancel(); return; }
    if (disabled || event.button !== 0 || (event.target as Element).closest("button,input,select,textarea")) return;
    if (event.pointerType === "mouse" && (event.target as Element).closest("a")) return;
    // Mouse text selection stays native; dragging the card header/background navigates.
    if (event.pointerType === "mouse" && (event.target as Element).closest(".swipe-card-copy")) return;
    suppressClickUntil.current = 0;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId || disabled) return;
    const x = event.clientX - start.x, y = event.clientY - start.y;
    if (!start.horizontal) {
      if (Math.abs(y) > 24 && Math.abs(y) > Math.abs(x) * 1.5) { cancel(); return; }
      if (Math.abs(x) < 10 || Math.abs(x) < Math.abs(y) * 1.15) return;
      start.horizontal = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    setDrag(Math.max(-140, Math.min(140, x)));
  };
  const finish = (event: PointerEvent<HTMLElement>) => {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId) return;
    const x = event.clientX - start.x, y = event.clientY - start.y;
    const threshold = Math.min(100, Math.max(40, event.currentTarget.clientWidth * .12));
    if (start.horizontal) {
      suppressClickUntil.current = Date.now() + 500;
    }
    cancel();
    if (!disabled && start.horizontal && Math.abs(x) >= threshold && Math.abs(x) > Math.abs(y) * 1.15 && !window.getSelection()?.toString()) onAdvance(x < 0 ? "different" : "next");
  };
  const articleLink = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); onOpenArticle(item);
  };
  return <article className={`swipe-card${drag ? " is-dragging" : ""}`} aria-labelledby="card-title" inert={!active}
    style={{ transform: drag ? `translateX(${drag}px) rotate(${drag / 45}deg)` : undefined }}
    onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel}
    onLostPointerCapture={event => {
      // Touch starts with implicit capture on the touched child. Transferring it
      // to this card emits a bubbling lost event from that child, not a cancel.
      if (event.target === event.currentTarget && event.pointerId === pointer.current?.id) cancel();
    }}
    onClickCapture={event => { if (Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); } }}>
    <header className="swipe-card-meta">
      <a href={topicPath(item.community, import.meta.env.BASE_URL)} onClick={event => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); onOpenTopic(item.community);
      }}>{topicLabel(item.community)}</a>
      <span>{{ news: "News", explainer: "Explained", story: "Story", banter: "Opinion" }[item.editorial?.format ?? "news"]} · AI-written</span>
    </header>
    <div className="swipe-card-reading" ref={reading}>
      <div className="swipe-card-copy" ref={copy} aria-hidden={!fits || undefined} style={{ visibility: fits ? undefined : "hidden" }}>
        <h1 id="card-title"><a href={href} tabIndex={fits ? undefined : -1} onClick={articleLink}>{item.title}</a></h1>
        {hiddenSpoilers ? <button className="card-spoilers" tabIndex={fits ? undefined : -1} onClick={() => setSpoilers(true)}>Show spoilers</button> : <p>{item.body}</p>}
      </div>
      {!fits && <div className="card-fit-notice" role="status">
        <strong>This post needs more room at this screen size.</strong>
        <p>Open the article to read it in full, or try a taller or wider view.</p>
        <a href={href} onClick={articleLink}>Open article</a>
      </div>}
    </div>
    <footer className="swipe-card-footer">
      <div className="card-sources" aria-label="Sources">{item.editorial?.sources.map((source, index) => <div className="card-source" key={source.url}>
        <a href={source.url} target="_blank" rel="noreferrer" title={source.title} aria-label={`${source.publisher}: ${source.title}`}>{source.publisher}{item.editorial!.sources.filter(s => s.publisher === source.publisher).length > 1 ? ` ${index + 1}` : ""} ↗</a>
        {" · "}<PublicationDate iso={source.publishedAt} />
      </div>)}</div>
      <a href={href} onClick={articleLink}>{item.editorial?.discussion?.length ? `Article & discussion (${item.editorial.discussion.length})` : "Open article"} ↗</a>
    </footer>
  </article>;
}
