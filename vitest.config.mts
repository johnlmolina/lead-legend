import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // "server-only" is a Next.js-bundler-time footgun guard (throws if it
    // ends up in a client bundle) — it has no meaning under plain
    // Vite/Vitest and would otherwise make every server-only module
    // unimportable in tests. Alias it to a no-op stub for tests only; the
    // real app still gets the real package via Next's own build.
    alias: { "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts") },
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", "e2e", "archive"],
  },
});
