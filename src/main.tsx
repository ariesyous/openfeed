import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { deferReveal, markReady } from "./lib/ready";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

// Keep build-time HTML on screen while the app loads its first content offscreen.
let container = rootElement;
if (rootElement.childElementCount) {
  container = document.createElement("div");
  container.id = "app";
  container.hidden = true;
  rootElement.after(container);
  deferReveal(() => {
    rootElement.remove();
    container.hidden = false;
  });
  setTimeout(markReady, 4000);
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
