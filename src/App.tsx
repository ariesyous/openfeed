import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArticleFooter } from "./components/ArticleFooter";
import { FeedList } from "./components/FeedList";
import { PostCard } from "./components/PostCard";
import { TransparencyBanner } from "./components/TransparencyBanner";
import { FeedItemSchema, type FeedItem } from "../schemas";
import { topicFromPath, topicLabel, topicPath, topicSlug } from "../shared/topics";
import { articlePath, matchesArticleSlug } from "../shared/articles";
import { articleMetadata, collectionMetadata, isShareImages, type ShareImages } from "../shared/seo";
import { updateMetadata } from "./metadata";
import { markReady } from "./lib/ready";

// Secondary views load on demand so the default feed bundle stays small.
const CardView = lazy(() => import("./components/CardView").then(module => ({ default: module.CardView })));
const SearchView = lazy(() => import("./components/SearchView").then(module => ({ default: module.SearchView })));

const base = import.meta.env.BASE_URL;
const cardsRoute = () => new URLSearchParams(window.location.search).get("view") === "cards";
const searchRoute = () => window.location.pathname === `${base}search/`;
const plainClick = (event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; button: number }) =>
  !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0;
function embeddedArticle(): FeedItem | null {
  try {
    const item = FeedItemSchema.parse(JSON.parse(document.getElementById("article-data")?.textContent ?? "null"));
    return item.editorial && matchesArticleSlug(item, routeSlug() ?? "") ? item : null;
  }
  catch { return null; }
}
function routeSlug(): string | null {
  const prefix = `${base}p/`;
  if (!window.location.pathname.startsWith(prefix)) return null;
  const value = window.location.pathname.slice(prefix.length).replace(/\/$/, "");
  return /^[a-z0-9-]+$/.test(value) ? value : "invalid";
}

/** A directly loaded home/topic page already carries its own hashed share image. */
function initialShareImages(): ShareImages {
  const url = document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content;
  const topic = topicFromPath(window.location.pathname, base);
  if (!url || routeSlug() || searchRoute() || topic === null) return {};
  return { [topic]: { url, alt: document.head.querySelector<HTMLMetaElement>('meta[property="og:image:alt"]')?.content ?? "CoBanter" } };
}

export function App() {
  const site = useRef({ base, origin: new URL(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? window.location.origin).origin });
  const [viewMode, setViewMode] = useState<"feed" | "cards">(() => cardsRoute() ? "cards" : "feed");
  const [cardsMounted, setCardsMounted] = useState(cardsRoute);
  const feedScroll = useRef(0);
  const [community, setCommunity] = useState(() => topicFromPath(window.location.pathname, base));
  const [article, setArticle] = useState(embeddedArticle);
  const [articleRoute, setArticleRoute] = useState(() => Boolean(routeSlug()));
  const [searchActive, setSearchActive] = useState(searchRoute);
  const [searchMounted, setSearchMounted] = useState(searchRoute);
  const [feedMounted, setFeedMounted] = useState(() => !routeSlug() && !cardsRoute() && !searchRoute());
  const [routeError, setRouteError] = useState("");
  const [shareImages, setShareImages] = useState(initialShareImages);
  const shareImagesRequested = useRef(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return localStorage.getItem("openfeed-theme") === "light" ? "light" : "dark"; }
    catch { return "dark"; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#101215" : "#f6f5f3");
    try { localStorage.setItem("openfeed-theme", theme); } catch { /* Device storage may be disabled. */ }
  }, [theme]);
  useEffect(() => {
    const abort = new AbortController();
    let navigation = 0;
    const sync = async () => {
      const request = ++navigation;
      const slug = routeSlug();
      setArticleRoute(Boolean(slug));
      setRouteError("");
      if (!slug) {
        const search = searchRoute();
        setSearchActive(search);
        setArticle(null);
        if (search) { setSearchMounted(true); return; }
        const cards = cardsRoute();
        setViewMode(cards ? "cards" : "feed");
        if (cards) setCardsMounted(true);
        else { setCommunity(topicFromPath(window.location.pathname, base)); setFeedMounted(true); }
        requestAnimationFrame(() => window.scrollTo({ top: window.history.state?.feedScroll ?? 0 }));
        return;
      }
      setSearchActive(false);
      const embedded = embeddedArticle();
      if (embedded && matchesArticleSlug(embedded, slug)) { setArticle(embedded); return; }
      setArticle(null);
      try {
        const response = await fetch(`${base}p/${slug}/article.json`, { signal: abort.signal });
        if (!response.ok) throw new Error("unavailable");
        const item = FeedItemSchema.parse(await response.json());
        if (!item.editorial || !matchesArticleSlug(item, slug)) throw new Error("wrong article");
        if (!abort.signal.aborted && navigation === request) setArticle(item);
      } catch {
        if (!abort.signal.aborted && navigation === request) setRouteError("This article couldn't be loaded. Check your connection and try again.");
      }
    };
    window.addEventListener("popstate", sync);
    if (routeSlug() && !embeddedArticle()) void sync();
    return () => { abort.abort(); window.removeEventListener("popstate", sync); };
  }, []);
  useEffect(() => {
    if (articleRoute && article) {
      const canonicalPath = articlePath(article, base);
      if (window.location.pathname !== canonicalPath) {
        window.history.replaceState(window.history.state, "", canonicalPath + window.location.search + window.location.hash);
      }
      const url = new URL(canonicalPath, site.current.origin).href;
      const imageUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content;
      const samePage = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href === url;
      const image = samePage && imageUrl ? { url: imageUrl, alt: document.head.querySelector<HTMLMetaElement>('meta[property="og:image:alt"]')?.content ?? article.title ?? "CoBanter" } : undefined;
      updateMetadata(articleMetadata(article, site.current, image));
      markReady();
      requestAnimationFrame(() => { document.getElementById("article-view")?.focus(); window.scrollTo({ top: 0 }); });
    } else if (articleRoute && routeError) { updateMetadata({ title: "Article unavailable · CoBanter", description: routeError, noindex: true }); markReady(); }
    else if (searchActive) updateMetadata({ title: "Search · CoBanter", description: "Search every CoBanter article by headline, topic or publisher.", noindex: true });
    else if (!articleRoute) {
      if (community === null && viewMode !== "cards") markReady();
      updateMetadata(community === null && viewMode !== "cards"
        ? { title: "Topic not found · CoBanter", description: "This topic doesn't exist.", noindex: true }
        : collectionMetadata(site.current, viewMode === "cards" ? "" : community ?? "", [], shareImages[viewMode === "cards" ? "" : community ?? ""]));
    }
  }, [articleRoute, article, community, viewMode, routeError, searchActive, shareImages]);
  const collectionTopic = articleRoute || searchActive || (community === null && viewMode !== "cards") ? null : viewMode === "cards" ? "" : community ?? "";
  useEffect(() => {
    if (collectionTopic === null || collectionTopic in shareImages || shareImagesRequested.current) return;
    shareImagesRequested.current = true;
    fetch(`${base}data/share-images.json`)
      .then(response => response.ok ? response.json() : null)
      .then(value => { if (isShareImages(value)) setShareImages(current => ({ ...value, ...current })); })
      .catch(() => { /* Share images are optional metadata. */ });
  }, [collectionTopic, shareImages]);
  const origin = () => searchActive ? "search" : viewMode;
  const openArticle = (item: FeedItem) => {
    window.history.replaceState({ ...window.history.state, feedScroll: window.scrollY }, "");
    window.history.pushState({ fromFeed: true, depth: 1, from: origin(), feedPath: window.location.pathname + window.location.search }, "", articlePath(item, base));
    setRouteError(""); setSearchActive(false); setArticle(item); setArticleRoute(true);
  };
  /** Open an article by address (related reading, search results); the route loads its data. */
  const openPath = (path: string) => {
    const state = window.history.state ?? {};
    if (articleRoute) window.history.pushState(state.fromFeed ? { ...state, depth: (state.depth ?? 1) + 1 } : {}, "", path);
    else {
      window.history.replaceState({ ...state, feedScroll: window.scrollY }, "");
      window.history.pushState({ fromFeed: true, depth: 1, from: origin(), feedPath: window.location.pathname + window.location.search }, "", path);
    }
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  const openTopic = (topic: string) => {
    const path = topicPath(topic, base);
    if (window.location.pathname + window.location.search !== path) {
      window.history.replaceState({ ...window.history.state, feedScroll: window.scrollY }, "");
      window.history.pushState({}, "", path);
    }
    setViewMode("feed"); setSearchActive(false);
    setCommunity(topicFromPath(path, base)); setRouteError("");
    setArticleRoute(false); setArticle(null); setFeedMounted(true);
    window.scrollTo({ top: 0 });
  };
  const goHome = () => openTopic("");
  const openSearch = () => {
    if (!searchRoute()) {
      window.history.replaceState({ ...window.history.state, feedScroll: window.scrollY }, "");
      window.history.pushState({}, "", `${base}search/`);
    }
    setSearchActive(true); setSearchMounted(true); setArticleRoute(false); setArticle(null); setRouteError("");
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => document.getElementById("search-input")?.focus());
  };
  const changeView = (mode: "feed" | "cards") => {
    if (mode === viewMode && !articleRoute && !searchActive) return;
    if (mode === "cards" && !searchActive) feedScroll.current = window.scrollY;
    const path = mode === "cards" ? `${base}?view=cards` : topicPath(community ?? "", base);
    window.history.replaceState({ ...window.history.state, feedScroll: window.scrollY }, "");
    window.history.pushState({}, "", path);
    setViewMode(mode); setArticleRoute(false); setSearchActive(false); setRouteError("");
    if (mode === "cards") setCardsMounted(true); else setFeedMounted(true);
    requestAnimationFrame(() => {
      window.scrollTo({ top: mode === "cards" ? 0 : feedScroll.current });
      if (mode === "feed") document.querySelector<HTMLButtonElement>(".view-switch button[aria-pressed='true']")?.focus({ preventScroll: true });
    });
  };
  const openSearchRef = useRef(openSearch);
  useEffect(() => { openSearchRef.current = openSearch; });
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || (event.target as Element).closest?.("input,textarea,select,[contenteditable='true']")) return;
      event.preventDefault(); openSearchRef.current();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  const cardsActive = viewMode === "cards" && !articleRoute && !searchActive;
  const backState = window.history.state;
  const backLabel = backState?.from === "search" ? "← Back to search" : viewMode === "cards" ? "← Back to cards" : "← Back to feed";
  return <div className={`app${cardsActive ? " app--cards" : ""}`}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="app-header">
      <a className="app-title" href={base} onClick={(event) => { if (!plainClick(event)) return; event.preventDefault(); goHome(); }}><img className="app-mark" src={`${base}favicon.svg`} alt="" width="24" height="24" /><span className="app-name">CoBanter</span><span className="app-tagline"> A little more worth reading.</span></a>
      {!articleRoute && <nav className="view-switch" aria-label="Reading view">
        <button aria-pressed={viewMode === "feed" && !searchActive} onClick={() => changeView("feed")}>Feed</button>
        <button aria-pressed={viewMode === "cards" && !searchActive} onClick={() => changeView("cards")}>Cards</button>
      </nav>}
      <div className="header-actions">
        <a href={`${base}search/`} aria-label="Search" aria-current={searchActive ? "page" : undefined} title="Search articles (/)" onClick={(event) => { if (!plainClick(event)) return; event.preventDefault(); openSearch(); }}>
          <svg className="action-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg><span className="action-label">Search</span>
        </a>
        <button className="theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <svg className="action-icon" viewBox="0 0 24 24" aria-hidden="true">{theme === "dark"
            ? <><circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></>
            : <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />}</svg><span className="action-label">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
      </div>
    </header>
    {!cardsActive && <TransparencyBanner />}
    <main id="main" tabIndex={-1} className={`app-main${cardsActive ? " app-main--cards" : articleRoute ? " app-main--article" : searchActive ? "" : " app-main--feed"}`}>
      <div hidden={articleRoute || viewMode === "cards" || searchActive}>{feedMounted && community !== null && <FeedList key={community} community={community} onOpenTopic={openTopic} onOpenArticle={openArticle} />}</div>
      <Suspense fallback={(cardsActive || searchActive) && <p className="feed-status" role="status">Loading…</p>}>
        {cardsMounted && <div className="card-view-mount" hidden={!cardsActive}><CardView active={cardsActive} onOpenArticle={openArticle} onOpenTopic={openTopic} onExit={() => changeView("feed")} /></div>}
        {searchMounted && <div hidden={!searchActive || articleRoute}><SearchView active={searchActive && !articleRoute} onOpenPath={openPath} /></div>}
      </Suspense>
      {!articleRoute && !cardsActive && !searchActive && community === null && <section><h1>Topic not found</h1><p>This topic doesn't exist.</p><a href={base} onClick={(event) => { event.preventDefault(); goHome(); }}>Back to all topics</a></section>}
      {articleRoute && <section id="article-view" tabIndex={-1} aria-label="Article">
        <a href={backState?.feedPath ?? base} onClick={(event) => { if (!plainClick(event)) return; event.preventDefault(); if (window.history.state?.fromFeed) window.history.go(-(window.history.state.depth ?? 1)); else goHome(); }}>{backLabel}</a>
        {article ? <>
          <PostCard key={article.id} item={article} articleView accountsById={new Map()} onCommunityClick={openTopic} />
          <ArticleFooter item={article} onOpenPath={openPath} onOpenTopic={openTopic} />
        </> : <p role="status">{routeError || "Loading article…"}</p>}
        {routeError && <button onClick={() => window.dispatchEvent(new PopStateEvent("popstate"))}>Try again</button>}
      </section>}
    </main>
    {!cardsActive && <footer className="site-links">
      <a href={`${base}about/`}>How CoBanter works</a>
      <a href={`${base}archive/`}>Article archive</a>
      <a href={community ? `${base}topics/${topicSlug(community)}/feed.xml` : `${base}feed.xml`}>RSS{community ? ` · ${topicLabel(community)}` : ""}</a>
    </footer>}
  </div>;
}
export default App;
