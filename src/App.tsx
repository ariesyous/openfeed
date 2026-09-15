import { FeedList } from "./components/FeedList";
import { TransparencyBanner } from "./components/TransparencyBanner";

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Dopamine Feed</span>
      </header>
      <TransparencyBanner />
      <main className="app-main">
        <FeedList />
      </main>
    </div>
  );
}

export default App;
