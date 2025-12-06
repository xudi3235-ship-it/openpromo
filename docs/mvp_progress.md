# 12/4/2025, mvp launch progress tracking
OpenPromo, Inc
<!-- ------------------------------------------------ -->
<!-- section: north star. top line goal. if features are not marked/prefixed as todo/planned/wip, it's complete.

For AI Agents/LLMs, DO NOT edit this section.

-->
<!-- ------------------------------------------------ -->

## Launch scopes
here are the launch scopes for MVP

### Account Linking Infra
support tiktok business(!, diff from regular tiktok dev api). IG + FB.

*implemented
- FB login, page 1:1 CA(connected account)
- IG login, ig acc 1:1 CA.
- TT biz login, same 1:1

that's it. all our features below are centered aroudn these platforms. Some feature migth be specific to certain platform, that's okay.

*Missing
- wip: simplify the tiktok business integration, only use tiktok business api.
- wip: check if we need to supprot IG w/ FB login.
- check the access token, might need some periodic jobs to renew per workspace if possible.
- tiktok biz access token is a bit unclear for how long it lasts until expiration
- encrypt, ensure the access token is not returned anywhere to client side.
- current oauth flow uses typescript, not zod schema, should we enforce the schemas here? also needs more observability maybe using posthog.

### Composer
core content publishing
- schedule content
- draft content
- content auto-fix, for img/video to resolve e.g. aspect ratio problems.
- preview
- CTA features, first comment, etc. 


*Missing
- one click to generate thumbnail for videos. this is really critical
- music selection..? not sure if this has enough prioroty

### Content Management
content infra, providesr crud on the source platforms, backfills, fetches metrics/insights.

*Implemented
- content planner, content table view, with common actions like reschedule, DnD, edit draft, etc.

*Missing
- audit the current state for backfill. for backfilled one, check their lifecycle,s what actions can be taken, etc.
- a detail view when click on specific published posts
- table view's metrics needs to be set up and refreshed nightly.
- planner's week view might need some re-work, mayeb the vertical timeline we need to slice it to X min of interval, so that scheduling for specific timeblock is easier, e.g. 20min interval? but need to consider how to render when multiple posts collide.

### Image-genAI, video-genAI
working product visuals page, powered by DO, for image/video gen w/ product image inputs.

*Done
- product image, avatar url, brand asset url, etc. input -> DO -> image gen.
- similarly, for video gen. powered by veo3.1 and sora2 storyboard.

*Missing
- add presets in the ui & DO. is it the same as style? maybe not, i want presets to be even more high level, abstracted, higher quality handpicked one that can reduce the uncercaintiy in output.
- tune the prompt to address the slow dialogue issue for specific UGC video types.
- we have to double down in this cloning path, it has to be stunning, by finding the best ads, etiher from visuals, creative ideas, etc. reverse-eng the top-performing ads, breakdown the visuals, structure, framework, and apply the treatment to user's brand/product context.

### Inbox -> DM + Comments
support basic functionaltiy for engaging with inbox related, including btoh DMs as well as comments features.

*Missing
- audit the current state for the feature parity across the plats.
- WIP, pending integrations with tiktok business messaging api.

### Insights
metrics/insights/growth related, shows performance and how much value OP added.


### Workspace features
basic workspace CRUD, team mgmt features. mostly done.

### payments infra
TBD, not sure to go with stripe or polar.sh. latter is MoR, but needs 4% cut.

*Missing
- not started at all. need to figure out a pricing first compared to other products and our pmf.

### notification/emails
TBD, gonna use resend for marketing emails.

### Nux, onboarding
for new users onboarding flow and ramp up, not implemented at all.

*Missing
- when a new workspace is created, go through the onboarding flow

### www site
landing site, key marketing, will do this after features are ready.

*missing
- revamped landing design
- SEOs

### telemetry, observaibility

*Done
- added posthog in both dashboard and www. Haven't fully verified e2e flows yet.

*Missing
- might need to add sentry?

### social media runs
before we launch, we will internally test and run our own social channels using our platform to dogfood.

this includes creating the media, engage with customers, etc. We should aim to solve all our tasks/problems internally on our platform.


<!-- ------------------------------------------------ -->
<!-- section: engineering arch, tech designs  -->
<!-- ------------------------------------------------ -->
## infra/tech designs
*most of our code is deployed on cloudflare worker runtime. it runs a hono api + orpc(similar to trpc) to power api, and then client side we have a tankstack router react SPA app.

infra side, we heavily built on top of cloudflare products, including r2, analytics, queue, kv, durable objects(Agent, Container, etc), and more.

for upstream services, we have multiple providers, including oens for image gen like replicate, and/or other serivces providers like TikHub.io. check the `providers` dir in core as well.

for ffmpeg related, we run then in go, check `containers.ts` in core pkg. communication is done worker <> container via connectrpc, a grpc-compatible protocal.

we also have python runtime(not used in prod yet) in `packages/backend` that runs on modal, a serverless gpu platform for genAI. for now it's used for experimenting/prototyping. for us we donlt realy need gpu, so CF container works perfectly fine for us and connect rpc gave us the typesafety.

we register at `scripts/meerkat.sh` which is a single script to run codegen across our pkgs, including building openapi docs, generating protobufs, buf builds, etc.



<!-- ------------------------------------------------ -->
<!-- section: Long term roadmaps  -->
<!-- ------------------------------------------------ -->
## Longterm roadmaps
here are the longterm roadmap items. eventually we wanna build a solid platform product, but our key driver is to bring ads growth/revenue conversion for SMBs.

### roadmap: Q1'26

- consolidate design principles; add them as skills/docs, to provide a foundation, extract reusable building blocks to speed up DevEx
- linkedin support, critical for SMBs, especially for certain sector.
- establish a solid foundation for our core features, e.g. content, genai, insights, inbox! ensure performance, uptime, reliability.

### roadmap: backlog, longterm
- wip, `unified-ad` table, for L1, L2, L3 structure across meta, google, tt ad; this will build the foundation for automating ads creation and optiomization.
- integrate to clickhouse for all the metrics, events logging; or evaluate if cloudflare analytics is a good option.. or stream to r2 logs
- support ai-agents for inbox-related automation, understands business context, and is able to automate & drive outcomes for handling DM, posts comments properly. 




<!-- ------------------------------------------------ -->
<!-- section: execution todos. for AI Agents, use this section to capture the TODOs, updates, etc.
 -->
<!-- ------------------------------------------------ -->