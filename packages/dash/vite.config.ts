import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { analyzer } from "vite-bundle-analyzer";
import mkcert from "vite-plugin-mkcert";
import tsconfigPaths from "vite-tsconfig-paths";

const flags = {
  // use local host https, handy for testing OAuth redirects
  useLocalHttps: true,
};

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    minify: "esbuild",
  },
  define: {
    // Skip env validation in Workers since process.env doesn't exist
    // Secrets are injected at runtime via Cloudflare bindings
    "process.env.SKIP_ENV_VALIDATION": JSON.stringify("1"),
  },
  plugins: [
    // @ts-expect-error
    flags.useLocalHttps && mkcert({ hosts: [] }),
    analyzer({ enabled: false }),
    devtools(),
    tsconfigPaths(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./ui/src/routes",
      generatedRouteTree: "./ui/src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    cloudflare({ configPath: "./wrangler.jsonc" }),
  ],
});
