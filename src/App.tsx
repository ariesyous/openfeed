import { useEffect, useRef, useState } from "react";
import { CardView } from "./components/CardView";
import { FeedList } from "./components/FeedList";
import { PostCard } from "./components/PostCard";
import { TransparencyBanner } from "./components/TransparencyBanner";
import { FeedItemSchema, type FeedItem } from "../schemas";
import { topicFromPath, topicPath } from "../shared/topics";
import { articlePath, matchesArticleSlug } from "../shared/articles";
import { articleMetadata, collectionMetadata } from "../shared/seo";
import { updateMetadata } from "./metadata";

const base = import.meta.env.BASE_URL;
const cardsRoute = () => new URLSearchParams(window.location.search).get("view") === "cards";
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

export function App() {
  const site = useRef({ base, origin: new URL(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? window.location.origin).origin });
  const [viewMode, setViewMode] = useState<"feed" | "cards">(() => cardsRoute() ? "cards" : "feed");
  const [cardsMounted, setCardsMounted] = useState(cardsRoute);
  const feedScroll = useRef(0);
  const [community, setCommunity] = useState(() => topicFromPath(window.location.pathname, base));
  const [article, setArticle] = useState(embeddedArticle);
  const [articleRoute, setArticleRoute] = useState(() => Boolean(routeSlug()));
  const [feedMounted, setFeedMounted] = useState(() => !routeSlug() && !cardsRoute());
  const [routeError, setRouteError] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return localStorage.getItem("openfeed-theme") === "light" ? "light" : "dark"; }
    catch { return "dark"; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
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
        const cards = cardsRoute();
        setViewMode(cards ? "cards" : "feed");
        if (cards) setCardsMounted(true);
        else { setCommunity(topicFromPath(window.location.pathname, base)); setFeedMounted(true); }
        setArticle(null);
        requestAnimationFrame(() => window.scrollTo({ top: window.history.state?.feedScroll ?? 0 }));
        return;
      }
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
      requestAnimationFrame(() => { document.getElementById("article-view")?.focus(); window.scrollTo({ top: 0 }); });
    } else if (articleRoute && routeError) updateMetadata({ title: "Article unavailable · CoBanter", description: routeError, noindex: true });
    else if (!articleRoute) {
      updateMetadata(community === null && viewMode !== "cards"
        ? { title: "Topic not found · CoBanter", description: "This topic doesn't exist.", noindex: true }
        : collectionMetadata(site.current, viewMode === "cards" ? "" : community ?? ""));
    }
  }, [articleRoute, article, community, viewMode, routeError]);
  const openArticle = (item: FeedItem) => {
    window.history.replaceState({ ...window.history.state, feedScroll: window.scrollY }, "");
    window.history.pushState({ fromFeed: true, feedPath: window.location.pathname + window.location.search }, "", articlePath(item, base));
    setRouteError(""); setArticle(item); setArticleRoute(true);
  };
  const openTopic = (topic: string) => {
    const path = topicPath(topic, base);
    if (window.location.pathname + window.location.search !== path) {
      window.history.replaceState({ ...window.history.state, feedScroll: window.scrollY }, "");
      window.history.pushState({}, "", path);
    }
    setViewMode("feed");
    setCommunity(topicFromPath(path, base)); setRouteError("");
    setArticleRoute(false); setArticle(null); setFeedMounted(true);
    window.scrollTo({ top: 0 });
  };
  const goHome = () => openTopic("");
  const changeView = (mode: "feed" | "cards") => {
    if (mode === viewMode && !articleRoute) return;
    if (mode === "cards") feedScroll.current = window.scrollY;
    const path = mode === "cards" ? `${base}?view=cards` : topicPath(community ?? "", base);
    window.history.replaceState({ ...window.history.state, feedScroll: window.scrollY }, "");
    window.history.pushState({}, "", path);
    setViewMode(mode); setArticleRoute(false); setRouteError("");
    if (mode === "cards") setCardsMounted(true); else setFeedMounted(true);
    requestAnimationFrame(() => {
      window.scrollTo({ top: mode === "cards" ? 0 : feedScroll.current });
      if (mode === "feed") document.querySelector<HTMLButtonElement>(".view-switch button[aria-pressed='true']")?.focus({ preventScroll: true });
    });
  };
  const cardsActive = viewMode === "cards" && !articleRoute;
  return <div className={`app${cardsActive ? " app--cards" : ""}`}>
    <header className="app-header">
      <a className="app-title" href={base} onClick={(event) => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); goHome(); }}>CoBanter<span className="app-tagline"> A little more worth reading.</span></a>
      {!articleRoute && <nav className="view-switch" aria-label="Reading view">
        <button aria-pressed={viewMode === "feed"} onClick={() => changeView("feed")}>Feed</button>
        <button aria-pressed={viewMode === "cards"} onClick={() => changeView("cards")}>Cards</button>
      </nav>}
      <div className="header-actions">
        <button className="theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Light mode" : "Dark mode"}</button>
      </div>
    </header>
    {!cardsActive && <TransparencyBanner />}
    <main className={`app-main${cardsActive ? " app-main--cards" : articleRoute ? "" : " app-main--feed"}`}>
      <div hidden={articleRoute || viewMode === "cards"}>{feedMounted && community !== null && <FeedList key={community} community={community} onOpenTopic={openTopic} onOpenArticle={openArticle} />}</div>
      {cardsMounted && <div className="card-view-mount" hidden={!cardsActive}><CardView active={cardsActive} onOpenArticle={openArticle} onOpenTopic={openTopic} onExit={() => changeView("feed")} /></div>}
      {!articleRoute && !cardsActive && community === null && <section><h1>Topic not found</h1><p>This topic doesn't exist.</p><a href={base} onClick={(event) => { event.preventDefault(); goHome(); }}>Back to all topics</a></section>}
      {articleRoute && <section id="article-view" tabIndex={-1} aria-label="Article">
        <a href={window.history.state?.feedPath ?? base} onClick={(event) => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); if (window.history.state?.fromFeed) window.history.back(); else goHome(); }}>{viewMode === "cards" ? "← Back to cards" : "← Back to feed"}</a>
        {article ? <PostCard key={article.id} item={article} articleView accountsById={new Map()} onCommunityClick={openTopic} /> : <p role="status">{routeError || "Loading article…"}</p>}
        {routeError && <button onClick={() => window.dispatchEvent(new PopStateEvent("popstate"))}>Try again</button>}
      </section>}
    </main>
    {!cardsActive && <footer className="site-links"><a href={`${base}archive/`}>Article archive</a></footer>}
  </div>;
}
export default App;
