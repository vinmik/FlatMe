import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import { createViteConfig } from "./vite.config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default mergeConfig(
  createViteConfig("test"),
  defineConfig({
    test: {
      root,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      css: false,
      restoreMocks: true,
      // Deterministic defaults regardless of a developer's .env.local: mock backend, auth enabled.
      env: { VITE_API_BASE_URL: "", VITE_USE_MOCKS: "true", VITE_ADMIN_AUTH_DISABLED: "false" },
    },
  }),
);
