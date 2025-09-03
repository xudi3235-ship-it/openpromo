import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => ({
  server: {
    port: 3000,
  },
  plugins: [
    tsconfigPaths(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./ui/src/routes",
      generatedRouteTree: "./ui/src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    cloudflare({
      configPath: "./wrangler.jsonc",
    }),
  ],
}));
