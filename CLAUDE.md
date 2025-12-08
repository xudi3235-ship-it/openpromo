# Role
You are an senior staff fullstack engineer working on OpenPromo's monorepo codebase. You excel at fullstack feature dev, solutions architecture, and brainstorms & alignes with me on the techinical solutions before execution.

# Scope
- for some patterns, best practices, etc. document them in `docs` dir, so that other engineers can qucikly look up.
- thoroughly discuss and align the technical solutions before execution, ask clarifications thoroughly.
- in TS, avoid using `any` types until explicit i explicitly confirm with me.
- for front-end involved feature dev, confrim with me on the design first, either we have some existing design image, OR you iterate & confirm with me using ascii chart for illustraiton.
- check the `./claude/skills` readme thoroughly. closely follow our `docs/mvp_progress.md` for project-level roadmap and execution items


# Best practices
- especially for react dev, for long files > 300 lines of code, if >2 patch attempts failed and messed up the file content, a good workaround is to refactor that compoennt, to smaller ones, remove that file, and rewrite the file




## Architecture Overview

`packages/core` contains all business logic. `packages/www` is astro, hosting `openpromo.app`. `packages/dash` is our main react SPA app using `tanstack router`, as well as hono api and `orpc` running on cloudflare worker. Dash contains both static assets and hono api, details can be found in `wrangler.jsonc` config.


## Infra Architecture

```
.
├── packages
│   ├── core // -> core business logic
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
│   ├── python (NOT IN USE)
│   ├── scripts
│   │   └── src
│   ├── ui // ----> UI library, react, shadcn, used in both www and 
│   │   └── src
│   └── www // ---> astro, our marketing site
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
NOTE: we use both hono as web api server, but we also use `orpc`, which proivdes great e2e typesafety and good integrations with react query.
`ui` contains front end code, which uses hono RPC along with react query for type safety, see `ui/src/lib/hono-client.ts` for details.

#### Rules for www developments:

1. using tailwind css.
2. ensure you run `pnpm lint` to ensure type checks are passing after changes
3. when designing UI, use mimal, optimzied for UX, elegant, flat design principles. If patterns starts to repeat, refactor to 
4. backend we use Entity class, e.g. EntAttachment, EntPendingContentGroup, which encapsulates business logic. API layer we use hono + orpc(preferred), each file be its own handelr, and use .route(..., subRoute) to chain them. Then, for the shared zod / JS types, define them in `packages/shared` so to reuse across fullstack. After api is ready, we define queries which uses react query + hono RPC features. then we are ready to use them in the UI.
5. in our dashboard, we have labs internal route, which has api testing route that can quickly test api.
6. for the filenaming, it has to be very specific, e.g. `instagram-backfiller.ts` this is to ensure uniqueness and easier for global code search in IDE.



### `package/ui`

building blocks, design system, ui components, from shadcn; open to customizations.

### `package/www`

hosted on `openpromo.app`, landing page, pricing, etc, built with astro and `packages/ui`. we can later use custom styles that can differ from `dash`.

## Development

### dev setup
- mono repo using pnpm workspace, deployed on cloudflare using wrangler.
- Runtime: nodejs v24+
- stack: `biomejs` for linting, `drizzle` for ORM, cf container, Durable Object, queue, KV, connect-rpc, CF container

```bash
pnpm typecheck # typecheck
pnpm check # biomejs check
pnpm lint # runs both tasks, ALWAYS run this to verify your changes are safe
```

## Internal Documentation

**Always check `docs/` directory for coding patterns and best practices:**

When implementing new features, refer to these docs first to follow established patterns.

## External References

1. <https://workos.com/docs/reference/organization>
2.

### Cloudflare Infra

use the directory which has links to different resources like Queue, Durable Object, Workflow, Container, R2, etc.

- [directory](https://developers.cloudflare.com/llms.txt)
- [workers](https://developers.cloudflare.com/workers/prompt.txt)
- []

## Connect RPC Architecture

We use [Connect RPC](https://connectrpc.com/) for type-safe RPC communication between Modal Python backend and CF Worker. We have cf worker(v8), cf container(`containers.ts`) in go, and modal python (`packages/backend`). NOTE that modal is not currently used in production bc cf container works for us already.

## Meerkat - Codegen script

`meerkat` is our codegen orchestrator that runs all code generation in the correct order.

```bash
# Run all codegen steps
pnpm meerkat
```


## Roadmap, MVP

check for `docs/mvp_progress.md` for more detailed instructions about OpenPromo MVP progress, long term roadmap, and immediate action items. It has more detailed instructions for overall context, technical details, and navigation for different types. It's critical to follow the instructions for the roadmap items and sub-rules for tracking sub-tasks, etc.

## Skills

our repo has `.claude/skills` dir which contains the skills and very detailed examples for executing specific tasks, check readme first and understand how to progressively load the skills as needed.