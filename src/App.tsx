import { useEffect, useState } from "react";
import { FeedList } from "./components/FeedList";
import { PostCard } from "./components/PostCard";
import { TransparencyBanner } from "./components/TransparencyBanner";
import { FeedItemSchema, type FeedItem } from "../schemas";
import { articlePath, articleSlug } from "../shared/articles";

const base = import.meta.env.BASE_URL;
function embeddedArticle(): FeedItem | null {
  try { return FeedItemSchema.parse(JSON.parse(document.getElementById("article-data")?.textContent ?? "null")); }
  catch { return null; }
}
function routeSlug(): string | null {
  const prefix = `${base}p/`;
  if (!window.location.pathname.startsWith(prefix)) return null;
  const value = window.location.pathname.slice(prefix.length).replace(/\/$/, "");
  return /^[a-z0-9-]+$/.test(value) ? value : "invalid";
}

export function App() {
  const [article, setArticle] = useState(embeddedArticle);
  const [articleRoute, setArticleRoute] = useState(() => Boolean(routeSlug()));
  const [feedMounted, setFeedMounted] = useState(() => !routeSlug());
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
        setFeedMounted(true);
        setArticle(null);
        requestAnimationFrame(() => window.scrollTo({ top: window.history.state?.feedScroll ?? 0 }));
        return;
      }
      const embedded = embeddedArticle();
      if (embedded && articleSlug(embedded) === slug) { setArticle(embedded); return; }
      setArticle(null);
      try {
        const response = await fetch(`${base}p/${slug}/article.json`, { signal: abort.signal });
        if (!response.ok) throw new Error("unavailable");
        const item = FeedItemSchema.parse(await response.json());
        if (!item.editorial || articleSlug(item) !== slug) throw new Error("wrong article");
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
      document.title = `${article.title ?? "Article"} · OpenFeed`;
      requestAnimationFrame(() => { document.getElementById("article-view")?.focus(); window.scrollTo({ top: 0 }); });
    } else if (!articleRoute) document.title = "OpenFeed";
  }, [articleRoute, article]);
  const openArticle = (item: FeedItem) => {
    window.history.replaceState({ ...window.history.state, feedScroll: window.scrollY }, "");
    window.history.pushState({ fromFeed: true }, "", articlePath(item, base));
    setRouteError(""); setArticle(item); setArticleRoute(true);
  };
  const goHome = () => {
    window.history.pushState({}, "", base);
    setArticleRoute(false); setArticle(null); setFeedMounted(true);
    window.scrollTo({ top: 0 });
  };
  return <div className="app">
    <header className="app-header">
      <a className="app-title" href={base} onClick={(event) => { event.preventDefault(); goHome(); }}>OpenFeed<span className="app-tagline"> A little more worth reading.</span></a>
      <div className="header-actions">
        <button className="theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Light mode" : "Dark mode"}</button>
      </div>
    </header>
    <TransparencyBanner />
    <main className={`app-main${articleRoute ? "" : " app-main--feed"}`}>
      <div hidden={articleRoute}>{feedMounted && <FeedList onOpenArticle={openArticle} />}</div>
      {articleRoute && <section id="article-view" tabIndex={-1} aria-label="Article">
        <a href={base} onClick={(event) => { event.preventDefault(); if (window.history.state?.fromFeed) window.history.back(); else goHome(); }}>← Back to feed</a>
        {article ? <PostCard key={article.id} item={article} articleView accountsById={new Map()} /> : <p role="status">{routeError || "Loading article…"}</p>}
        {routeError && <button onClick={() => window.dispatchEvent(new PopStateEvent("popstate"))}>Try again</button>}
      </section>}
    </main>
  </div>;
}
export default App;
