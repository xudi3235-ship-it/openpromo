# building fullstack features

1. backend: business logic lives in `packages/core`, under domain. for specfiic bindings, Durable Objects, Workflows, Agents(built on top of DO), Queue, etc. check the current impl for where they live and grouping. 
2. api-server: our latest features live in `orpc`, see `packages/dash/worker/src/orpc/index.ts` for all the routers. routers are grouped logically. here it imports business logic from `core` and scaffolds the api. NOTE: these entire api runs with hono api, on cf worker runtime, with nodejs_compact enbaled, BUT there's still some gap with actual nodejs runtime.
3. shared: `packages/shared` defines logics that are runtime-agnostic, e.g. zod schemas for reuse in backend and frontend, etc.
4. client-api: orpc has built-in integrations with react query. example `pacakges/dash/ui/src/queries/styles-queries.ts` for the integraion.
5. server-server: we have container backend built on CF container, and the server-server type safety is achieved via connect-rpc. see `packages/core/src/containers.ts` for impl.


## Appendix
1. worker runtime limits: 
    - aws sdk can't work, instead we either use aws-for-fetch, OR use the R2 bindings directly for R2 operations.
    - worker has limited file system. so sub-process spawning doesn't work nicely.
2. 