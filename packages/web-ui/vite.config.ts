import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const isDev = mode === "development";
  const domain = isDev ? (await import("sst")).Resource.Urls.domain : undefined;

  return {
    server: isDev
      ? {
          proxy: {
            "/auth": `https://${domain}`,
            "/api": `https://${domain}`,
          },
        }
      : undefined,
    plugins: [
      tsconfigPaths(),
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      viteReact(),
      tailwindcss(),
    ],
  };
});
