This file provides guidance for AI Agents working on OpenPromo codebase

# dev setup

- mono repo using pnpm workspace, deployed on cloudflare using wrangler.
- Runtime: nodejs v24+
- toolings: `biomejs` for linting, `drizzle` for ORM

## dev tasks

```bash
pnpm typecheck # typecheck
pnpm check # biomejs check
pnpm lint # runs both tasks, ALWAYS run this to verify your changes are safe
```

## Architecture Overview

`packages/core` contains all business logic. `packages/www` is astro, hosting `openpromo.app`. `packages/dash` is our main react SPA app using `tanstack router`, as well as hono api and `orpc` running on cloudflare worker. Dash contains both static assets and hono api, details can be found in `wrangler.jsonc` config.


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
NOTE: we use both hono as web api server, but we also use `orpc`, which proivdes great e2e typesafety and good integrations with react query.
`ui` contains front end code, which uses hono RPC along with react query for type safety, see `ui/src/lib/hono-client.ts` for details.

#### Rules for www developments:

1. using tailwind css, ensure all color works for dark mode.
2. ensure you run `pnpm check && pnpm typecheck` to ensure type checks are passing after changes
3. when designing UI, use mimal, optimzied for UX, elegant, flat design principles. If patterns starts to repeat, refactor to 
4. backend we use Entity class, e.g. EntAttachment, EntPendingContentGroup, which encapsulates business logic. API layer we use hono, each file be its own handelr, and use .route(..., subRoute) to chain them. Then, for the shared zod / JS types, define them in `packages/shared` so to reuse across fullstack. After api is ready, we define queries which uses react query + hono RPC features. then we are ready to use them in the UI.
5. in backend dev, use `console.log([1.])` statements to add debugging / tracing for the flow so that we can understand what's going wrong.
6. in our dashboard, we have labs internal route, which has api testing route that can quickly test api.
7. for any hono api routes, we integrate with react query, place them under `queries` dir, so that we can have fully typsafety. When in doubt, read existing routes for code examples.
8. for the filenaming, it has to be very specific, e.g. `instagram-backfiller.ts` this is to ensure uniqueness and easier for global code search.



### `package/ui`

building blocks, design system, ui components, from shadcn; open to customizations.

### `package/www`

hosted on `openpromo.app`, landing page, pricing, etc, built with astro and `packages/ui`. we can later use custom styles that can differ from `dash`.

## Development

1. start with `pnpm dev` under `packages/dash` which spins up the hono api as well as dashboard UI, on `https://localhost:3000`, it's https since we need to make Oauth work.
2. ALWAYS plan first, use pseudo code to confirm with user about the high level technical design, patterns, and NEEDS verbal approval before implementation.

## Internal Documentation

**Always check `docs/` directory for coding patterns and best practices:**

- `docs/coding-patterns.md` - Router hooks, shared schemas, search state management, prefetching patterns
- `docs/development.md` - Development workflow and setup
- `docs/design-principles.md` - UI/UX design guidelines

When implementing new features, refer to these docs first to follow established patterns.

## External References

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

## Connect RPC Architecture

We use [Connect RPC](https://connectrpc.com/) for type-safe RPC communication between Modal Python backend and CF Worker.

### Overview

```
Modal Python Backend          CF Worker (Hono)           Dashboard
       │                            │                        │
       │  Connect RPC (protobuf)    │                        │
       │──InternalService.VideoJobUpdate──►│                 │
       │                            │──dispatchWorkspaceEvent──►│
       │◄──success response─────────│     (WebSocket via DO)  │
```

### Proto Files

- **Location**: `packages/backend/proto/`
- **Internal service**: `internal/v1/internal.proto` - Modal → CF Worker callbacks
- **Video service**: `video/v1/video.proto` - Video processing RPCs

### Generated Code

- **Python (server/client)**: `packages/backend/src/gen/`
- **TypeScript (client)**: `packages/shared/src/gen/`

### Key Files

- `packages/dash/worker/src/routes/api/connect.ts` - Connect RPC server handler in CF Worker
- `packages/backend/src/rpc/internal_client.py` - Python Connect RPC client
- `packages/backend/src/core/callbacks.py` - Python utilities for pushing job updates
- `packages/shared/src/workspace/events.ts` - Zod schemas derived from proto enums

### Adding New RPCs

1. Define the RPC in proto file (`packages/backend/proto/`)
2. Run `pnpm meerkat` to generate code
3. Implement the handler in `connect.ts` (CF Worker side)
4. Use the generated client in Python

## Meerkat - Codegen Orchestrator

`meerkat` is our codegen orchestrator that runs all code generation in the correct order.

### Usage

```bash
# Run all codegen steps
pnpm meerkat

# Skip Modal OpenAPI generation (use existing openapi.json)
pnpm meerkat --skip-modal

# Skip legacy Python SDK generation (using Connect RPC instead)
pnpm meerkat --skip-sdk

# Skip both
pnpm meerkat --skip-modal --skip-sdk
```

### Steps

1. **Generate Python OpenAPI spec** from Modal/FastAPI (source of truth for callbacks)
2. **Generate Protobuf/Connect RPC code** for backend (Python) and client (TypeScript)
3. **Generate TypeScript Zod schemas** from Python OpenAPI via orval
4. **Generate Internal API OpenAPI spec** from ORPC routes
5. **Generate Python SDK** for Internal API (legacy, optional)

### Proto → Zod Type Derivation

The Zod schemas in `@shared/workspace/events.ts` are derived directly from proto enums:

```typescript
// VideoGenerationStateSchema is derived from proto VideoJobState enum
const VIDEO_JOB_STATE_MAP = {
  [VideoJobState.PROCESSING]: "processing",
  [VideoJobState.COMPLETED]: "completed",
  [VideoJobState.FAILED]: "failed",
} as const;

export const VideoGenerationStateSchema = z.enum([...]);
export function mapVideoJobState(protoState: VideoJobState): VideoGenerationState;
```

This ensures type consistency between proto definitions and Zod validation.
