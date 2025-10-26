# OpenPromo Website

This package contains the marketing website for OpenPromo — a lightweight platform that helps creators and small teams produce social-ready ad creative, launch campaigns, and grow using AI-powered workflows.

This site is built with Astro + React and uses the shared `@openpromo/ui` components from the monorepo.

## Quick start (local)

From the repo root:

```bash
pnpm install
pnpm --filter www run dev
```

Open http://localhost:4321 to preview the site.

## Scripts

- `pnpm --filter www run dev` — Run the dev server for the `www` package
- `pnpm --filter www run build` — Build the site
- `pnpm --filter www run typecheck` — Run TypeScript typecheck for the site
- `pnpm --filter www run preview` — Build + preview with wrangler (if configured)

## Where to edit

- Content & copy: `src/consts.ts`, `src/pages`, and `src/components/sections`
- Site metadata & SEO: `src/consts.ts`
- Public assets (images, favicons): `public/`

## Suggested next steps

- Replace `public/og-image.jpg` with a branded OG image (1200x630)
- Update hero and screenshots with product images / dashboard samples
- Add a short demo video or GIF to the hero to showcase the product

If you want me to apply a chosen hero copy, update the OG image, or wire new CTA links (signup/demo), tell me which changes and I will implement them.
