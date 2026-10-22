import { useEffect, useState, type MouseEvent } from "react";
import { articleRouteSlug } from "../../shared/articles";
import type { RelatedEntry, RelatedReading } from "../../shared/related";
import { topicLabel, topicPath } from "../../shared/topics";
import type { FeedItem } from "../../schemas";
import { PublicationDate } from "./PublicationDate";

const FORMAT_LABELS = { news: "News", explainer: "Explained", story: "True story", banter: "Banter · Opinion" } as const;
const plainClick = (event: MouseEvent) => !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0;

/** Build-time related reading for an article; absent data (e.g. in development) renders nothing. */
export function ArticleFooter({ item, onOpenPath, onOpenTopic }: {
  item: FeedItem;
  onOpenPath: (path: string) => void;
  onOpenTopic: (topic: string) => void;
}) {
  const [loaded, setLoaded] = useState<{ id: string; related: RelatedReading } | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    fetch(`${import.meta.env.BASE_URL}p/${articleRouteSlug(item)}/related.json`, { signal: abort.signal })
      .then(response => response.ok ? response.json() as Promise<RelatedReading> : null)
      .then(value => { if (value && Array.isArray(value.more)) setLoaded({ id: item.id, related: value }); })
      .catch(() => { /* Related reading is optional. */ });
    return () => abort.abort();
  }, [item]);
  const related = loaded?.id === item.id ? loaded.related : null;
  if (!related || (!related.more.length && !related.newer && !related.older)) return null;
  const label = topicLabel(related.topic);
  const link = (entry: RelatedEntry) => <a href={entry.path} onClick={(event) => {
    if (!plainClick(event)) return;
    event.preventDefault(); onOpenPath(entry.path);
  }}>
    <span className="related-title">{entry.title}</span>
    <span className="related-meta">{FORMAT_LABELS[entry.format]} · <PublicationDate iso={entry.createdAt} added /></span>
  </a>;
  return <nav className="related-reading" aria-label="Related reading">
    {related.more.length > 0 && <>
      <h2>More in <a href={topicPath(related.topic, import.meta.env.BASE_URL)} onClick={(event) => {
        if (!plainClick(event)) return;
        event.preventDefault(); onOpenTopic(related.topic);
      }}>{label}</a></h2>
      <ul>{related.more.map(entry => <li key={entry.path}>{link(entry)}</li>)}</ul>
    </>}
    {(related.newer || related.older) && <div className="related-sequence">
      {related.newer && <div><span>Newer in {label}</span>{link(related.newer)}</div>}
      {related.older && <div><span>Older in {label}</span>{link(related.older)}</div>}
    </div>}
  </nav>;
}
