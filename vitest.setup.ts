import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Not using vitest's `globals: true`, so @testing-library/react's own
// auto-cleanup (which detects a global afterEach) never registers — do it
// explicitly instead, or renders leak across tests in the same file.
afterEach(() => {
  cleanup();
});
