import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { searchArticles, type SearchIndex, type SearchRow } from "../../shared/search";
import { TOPICS, topicLabel } from "../../shared/topics";
import { markReady } from "../lib/ready";
import { PublicationDate } from "./PublicationDate";

const PAGE_SIZE = 50;
const FORMATS = [["news", "News"], ["explainer", "Explained"], ["story", "Stories"], ["banter", "Banter"]] as const;
const FORMAT_LABELS: Record<string, string> = { news: "News", explainer: "Explained", story: "True story", banter: "Banter · Opinion" };
const plainClick = (event: MouseEvent) => !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0;

let indexRequest: Promise<SearchRow[]> | null = null;
/** One shared download per page load; a failed request may be retried. */
function loadIndex(): Promise<SearchRow[]> {
  indexRequest ??= fetch(`${import.meta.env.BASE_URL}data/search-index.json`)
    .then(response => { if (!response.ok) throw new Error("unavailable"); return response.json() as Promise<SearchIndex>; })
    .then(index => { if (index.version !== 1 || !Array.isArray(index.articles)) throw new Error("unsupported"); return index.articles; })
    .catch(error => { indexRequest = null; throw error; });
  return indexRequest;
}

const initialParam = (name: string) => new URLSearchParams(window.location.search).get(name) ?? "";

export function SearchView({ active, onOpenPath }: { active: boolean; onOpenPath: (path: string) => void }) {
  const [rows, setRows] = useState<SearchRow[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(() => initialParam("q"));
  const [topic, setTopic] = useState(() => TOPICS.find(value => value === initialParam("topic")) ?? "");
  const [format, setFormat] = useState(() => FORMATS.find(([value]) => value === initialParam("format"))?.[0] ?? "");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const input = useRef<HTMLInputElement>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { markReady(); }, []);
  useEffect(() => { if (active) input.current?.focus({ preventScroll: true }); }, [active]);
  useEffect(() => {
    let current = true;
    loadIndex().then(value => { if (current) setRows(value); })
      .catch(() => { if (current) setError("Search couldn't load. Check your connection and try again."); });
    return () => { current = false; };
  }, [attempt]);
  useEffect(() => {
    if (!active) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (topic) params.set("topic", topic);
    if (format) params.set("format", format);
    const search = params.toString();
    const url = `${window.location.pathname}${search ? `?${search}` : ""}`;
    if (url !== window.location.pathname + window.location.search) window.history.replaceState(window.history.state, "", url);
  }, [active, query, topic, format]);

  const results = useMemo(() => rows ? searchArticles(rows, query, { topic, format }) : [], [rows, query, topic, format]);
  const searching = Boolean(query.trim() || topic || format);
  const update = (change: () => void) => { change(); setLimit(PAGE_SIZE); };

  return <section className="search-view" aria-label="Search articles">
    <h1>Search</h1>
    <form role="search" onSubmit={(event) => event.preventDefault()}>
      <label className="visually-hidden" htmlFor="search-input">Search headlines, topics and publishers</label>
      <input id="search-input" ref={input} className="search-box" type="search" placeholder="Search headlines, topics and publishers" autoComplete="off"
        value={query} onChange={(event) => update(() => setQuery(event.target.value))} />
    </form>
    <div className="search-filters" role="group" aria-label="Topic">
      {["", ...[...TOPICS].sort()].map(value => <button key={value || "all"} aria-pressed={topic === value} onClick={() => update(() => setTopic(value))}>{value ? topicLabel(value) : "All topics"}</button>)}
    </div>
    <div className="search-filters" role="group" aria-label="Format">
      <button aria-pressed={format === ""} onClick={() => update(() => setFormat(""))}>All formats</button>
      {FORMATS.map(([value, label]) => <button key={value} aria-pressed={format === value} onClick={() => update(() => setFormat(value))}>{label}</button>)}
    </div>
    {error ? <p className="feed-status feed-status-error" role="alert">{error} <button onClick={() => { setError(""); setAttempt(value => value + 1); }}>Try again</button></p>
      : !rows ? <p className="feed-status" role="status">Loading the article index…</p>
      : !searching ? <p className="search-summary">Search {rows.length.toLocaleString("en-US")} articles by headline, topic or publisher. Press <kbd>/</kbd> anywhere to jump here.</p>
      : <>
        <p className="search-summary" role="status">{results.length ? `${results.length.toLocaleString("en-US")} ${results.length === 1 ? "article" : "articles"}, newest first` : "No articles match. Try fewer words or another topic."}</p>
        <ul className="search-results">
          {results.slice(0, limit).map(([title, path, rowTopic, rowFormat, createdAt, publishers]) => <li key={path}>
            <a href={path} onClick={(event) => { if (!plainClick(event)) return; event.preventDefault(); onOpenPath(path); }}>{title}</a>
            <span className="related-meta">{FORMAT_LABELS[rowFormat] ?? rowFormat} · {topicLabel(rowTopic)} · <PublicationDate iso={createdAt} added />{publishers && ` · ${publishers}`}</span>
          </li>)}
        </ul>
        {results.length > limit && <button className="load-more" onClick={() => setLimit(value => value + PAGE_SIZE)}>Show more results</button>}
      </>}
  </section>;
}
