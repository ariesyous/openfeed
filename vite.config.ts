import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The custom Pages domain serves the app at the root. Keep archive URLs in sync.
  base: process.env.SITE_BASE_PATH ?? "/",
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
