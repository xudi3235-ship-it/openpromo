import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import tsconfigPaths from "vite-tsconfig-paths";

// https://astro.build/config
export default defineConfig({
  server: { port: 3001 },
  site: process.env.DASHBOARD_URL || "http://localhost:3000",
  integrations: [react()],
  vite: {
    // @ts-expect-error
    plugins: [tsconfigPaths(), tailwindcss()],
  },
});
