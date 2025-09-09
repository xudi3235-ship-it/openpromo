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
│   ├── js-shared
│   │   └── src
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

### `packages/dash`
`worker`contains our hono api, importing core buisness logic, with routes, middlewares, etc.
`ui` contains front end code, which uses hono RPC along with react query for type safety.

### `pack`



# docs/refs

1. <https://workos.com/docs/reference/organization>
2.
