import Unfonts from "unplugin-fonts/vite";

/**
 * Shared font configuration for unplugin-fonts
 * Can be imported in both Vite and Astro configs
 */
// biome-ignore lint: unplugin default export has typing issues
// @ts-ignore
export const geistFontConfig = Unfonts({
  custom: {
    families: [
      {
        name: "Geist",
        src: "./node_modules/@openpromo/ui/src/assets/fonts/geist/*.woff2",
      },
    ],
  },
});
