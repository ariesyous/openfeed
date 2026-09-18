// Development-only manual/browser verification entry point. Not a production
// route, content migration, alternative card implementation, or visual test pass.
import { createRoot } from "react-dom/client";
import { App } from "../../src/App";
import "../../src/index.css";
import { BatchFileSchema, ManifestSchema } from "../../schemas";
import { cardSamples } from "./cardSamples";

if (!import.meta.env.DEV) throw new Error("The Cards sample is development-only.");
const fetchOriginal = window.fetch.bind(window);
const manifest = ManifestSchema.parse(await (await fetchOriginal("/data/manifest.json")).json());
const batches = await Promise.all(manifest.batches.map(async ref => {
  // Load only the editions containing the fixed historical sample.
  if (!cardSamples.some(sample => sample.id.startsWith(`post-${ref.id}-`))) return [];
  return BatchFileSchema.parse(await (await fetchOriginal(`/data/${ref.file}`)).json()).items;
}));
const byId = new Map(batches.flat().map(item => [item.id, item]));
const selected = new URLSearchParams(location.search).get("sample");
const samples = selected ? cardSamples.filter(sample => sample.label === selected) : cardSamples;
if (!samples.length) throw new Error(`Unknown sample: ${selected}`);
const items = samples.map(sample => {
  const item = byId.get(sample.id);
  if (!item) throw new Error(`Missing historical sample: ${sample.id}`);
  return item;
});
const ref = { id: "card-verification", file: "batches/card-verification.json", generatedAt: manifest.generatedAt, itemCount: items.length };
// Production App/useFeed/useCardDeck/SwipeCard run unchanged. Substitute only the
// test catalog/batch responses; all title/body/source fields stay byte-for-byte.
window.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input), location.href);
  if (url.origin === location.origin && url.pathname === "/data/manifest.json") return Response.json({ ...manifest, batches: [ref], olderManifest: undefined });
  if (url.origin === location.origin && url.pathname === `/data/${ref.file}`) return Response.json({ batchId: ref.id, generatedAt: ref.generatedAt, items });
  return fetchOriginal(input, init);
};
createRoot(document.getElementById("root")!).render(<App />);
