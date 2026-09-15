import { useEffect, useState } from "react";
import { FeedList } from "./components/FeedList";
import { TransparencyBanner } from "./components/TransparencyBanner";

export function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      return localStorage.getItem("openfeed-theme") === "light"
        ? "light"
        : "dark";
    } catch {
      return "dark";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("openfeed-theme", theme);
    } catch {
      /* Storage may be disabled. */
    }
  }, [theme]);
  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">
          OpenFeed
          <span className="app-tagline"> A little more worth reading.</span>
        </span>
        <button
          className="theme-toggle"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </header>
      <TransparencyBanner />
      <main className="app-main">
        <FeedList />
      </main>
    </div>
  );
}
export default App;
