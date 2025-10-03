import { resolve } from "node:path";
import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// not ideal, our work is mainly in dash now
// later if we have a good monorepo setup
// we can do better ^_^
const dashDir = resolve(__dirname, "../dash");

export default defineConfig(({ mode }) => ({
  plugins: [tsconfigPaths()],
  test: {
    env: {
      ...loadEnv(mode, dashDir),
      SKIP_ENV_VALIDATION: "true",
    },
  },
}));
