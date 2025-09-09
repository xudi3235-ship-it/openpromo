# CLAUDE.md

This file provides guidance for AI Agents working on OpenPromo codebase

# dev setup
- mono repo using pnpm workspace, deployed on cloudflare using wrangler. 
- Runtime: nodejs v24+
- toolings: `biomejs`

## dev tasks
```bash
pnpm typecheck # typecheck
pnpm check # biomejs check
```

## Architecture Overview

`packages/core` contains all business logic. `packages/www` is astro, hosting `openpromo.app`. `packages/dash` is our main react SPA app using `tanstack router`, as well as hono api running on cloudflare worker. Dash contains both static assets and hono api, details can be found in `wrangler.jsonc` config.

remaining packages are not in active use, details TBD yet.


# docs/refs

1. <https://workos.com/docs/reference/organization>
2.
