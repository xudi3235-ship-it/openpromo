# structure

monorepo for openpromo. using pnpm and workspaces for pkg mgmt. stack repo is using: sst(for infra orchestration), pnpm(monorepo), aws lambda fn, sqs, etc, drizzle(ORM), postGres(neon).

The repo has `packages/core` which contains core business logics(db schema def, business logic), etc. The `packages/web-ui` defines the frontend, and `packages/web-api` defines the APIs interacting with the frontend, including auth. Infrastructure are structured under `infra` dir.

# product

openpromo supports x-platform content creation & mgmt, later will be expanded to ads integrations as well. For now, we wanna support FB+IG+Tiktok for content mgmt, scheduling, drafts, etc. It's a multi-tenant B2B apps, built around workspaces.

the key is the unified_content ent, which is N..1 to pending_content_group, which deals with scheduling & drafts. we use sdks to publish to specific platforms, e.g. Meta Business SDK for dealing with FB+IG, and later Tiktok business sdk etc.

to maintain flexibiltiy, we use jsons fields to store the "specs", and in publish time, it will translate & normalize the specs to params. NOTE that it's not a 1:1 map, since publishing multi-video media might contain multiple steps(upload video, create post, etc).

# current task

right now we're setting up the foundation for multi-tenant, we use workOS for centralized auth & org setup. now, help me update my schemas, located at `*.sql.ts` to create thin wrappers for the multi tenant setups. the high level flow: user onboards -> we create a default org -> which can contain multiple workspaces -> admin can invites multiple users with different roles, etc. use workos SDK for centralized management.

# docs/refs

1. <https://workos.com/docs/reference/organization>
2.
