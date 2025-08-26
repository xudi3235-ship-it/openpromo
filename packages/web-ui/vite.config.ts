import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

async function getDomain(): Promise<string | undefined> {
  try {
    return (await import("sst")).Resource.Urls.domain;
  } catch (error: unknown) {
    // TODO: this is trying to enable local dev for www
    // without depending on SST
    console.error("Error fetching domain:", error);
    return undefined;
  }
}

const alias = {
  "@/assets": path.resolve(__dirname, "src/assets"),
};

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const isDev = mode === "development";
  const domain = isDev ? await getDomain() : undefined;

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
    resolve: {
      alias,
    },
  };
});
