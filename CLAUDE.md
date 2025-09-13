# CLAUDE.md

This file provides guidance for AI Agents working on OpenPromo codebase

# dev setup

- mono repo using pnpm workspace, deployed on cloudflare using wrangler.
- Runtime: nodejs v24+
- toolings: `biomejs` for linting, `drizzle` for ORM

## dev tasks

```bash
pnpm typecheck # typecheck
pnpm check # biomejs check
```

## Architecture Overview

`packages/core` contains all business logic. `packages/www` is astro, hosting `openpromo.app`. `packages/dash` is our main react SPA app using `tanstack router`, as well as hono api running on cloudflare worker. Dash contains both static assets and hono api, details can be found in `wrangler.jsonc` config.

remaining packages are not in active use, details TBD yet.

## Infra Architecture

```
.
├── packages
│   ├── core
│   │   ├── migrations
│   │   └── src
│   │   └──── schemas --> sql def
│   │   └──── domain --> domain biz logic
│   │   └────── content --> core content data models
│   │   └────── connected-content --> platform integration, oauth, etc.
│   ├── dash // -----> dashboard + worker
│   │   ├── public
│   │   ├── ui // ---> hono api
│   │   └── worker// ---> react SPA, main dashboard
│   ├── python (NOT IN USE yet)
│   ├── scripts
│   │   └── src
│   ├── ui // ----> UI library, react, shadcn
│   │   └── src
│   └── www
│       ├── public
│       └── src
└── scripts
```

### `pacakages/core`:

`core/src/schemas` contains `*.sql.ts` which are drizzle table def. Modeling multi-tenant B2B use cases. `core/src/domain` contains domain related business logic groupings.

For content, we model `UnifedContent` as well as `PendingContentGroup`. 1st represent a piece of content, x-plat, on major social platforms, e.g. {FB|IG|TikTok}x{Story|Post|Reel}. group is for enabling scheduling, drafts.

We heavily build on top of Cloudflare's Durable Objects(DO), which powers Queue, Workflows, Containers, etc. We use `workflows` for serverless workflow long running tasks orchestration, e.g. content publishing tasks.

### `packages/dash`

hosted on `dash.openpromo.app`, main dashboard for using app. react SPA using tanstack router.
`worker`contains our hono api, importing core buisness logic, with routes, middlewares, etc.
`ui` contains front end code, which uses hono RPC along with react query for type safety, see `ui/src/lib/hono-client.ts` for details.

#### Rules for www developments:

1. using tailwind css, ensure all color works for dark mode.
2. ensure you run `pnpm check && pnpm typecheck` to ensure type checks are passing after changes
3. when designing UI, use mimal, optimzied for UX, elegant, flat design principles.


### `package/ui`

building blocks, design system, ui components, from shadcn; open to customizations.

### `package/www`

hosted on `openpromo.app`, landing page, pricing, etc, built with astro and `packages/ui`. we can later use custom styles that can differ from `dash`.

## Development

1. start with `pnpm dev` under `packages/dash` which spins up the hono api as well as dashboard UI, on `https://localhost:3000`, it's https since we need to make Oauth work.
2.

## docs/refs

1. <https://workos.com/docs/reference/organization>
2.

### Cloudflare Infra

use the directory which has links to different resources like Queue, Durable Object, Workflow, Container, R2, etc.

- [directory](https://developers.cloudflare.com/llms.txt)
- [workers](https://developers.cloudflare.com/workers/prompt.txt)
- []

## Legacy packages

Below are the packages that are no longer in use, only kept in monorepo for future references.

- `packages/web-api`
- `packages/web-ui`
