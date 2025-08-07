# structure

monorepo for openpromo. using pnpm and workspaces for pkg mgmt. stack repo is using: sst(for infra orchestration), pnpm(monorepo), aws lambda fn, sqs, etc, drizzle(ORM), mySQL(planetscale).

The repo has `packages/core` which contains core business logics(db schema def, business logic), etc. the `packages/functions` defines all the fns, infras are structured under `infra` dir.

# product

openpromo supports x-platform content creation & mgmt, later will be expanded to ads integrations as well. For now, we wanna support FB+IG+Tiktok for content mgmt, scheduling, drafts, etc. It's a multi-tenant B2B apps, built around workspaces.

the key is the unified_content ent, which is N..1 to pending_content_group, which deals with scheduling & drafts. we use sdks to publish to specific platforms, e.g. Meta Business SDK for dealing with FB+IG, and later Tiktok business sdk etc.

to maintain flexibiltiy, we use jsons fields to store the "specs", and in publish time, it will translate & normalize the specs to params. NOTE that it's not a 1:1 map, since publishing multi-video media might contain multiple steps(upload video, create post, etc).

# docs/refs

# security

1. Remember, often use Actor.assert("...") to validate the role.
2. For workspace operations, you might need frequently consider using assertWorkspaceAccess for safe.

# frontend

1. We use Radix UI, Shadcn UI, origin UI with Tailwind CSS v4.
2. For design principal, please keep it clean, modern and responsive, following "mobile-first" rule.
3. DO NOT USE bg-indigo-500!!!! --- give me more open options.
