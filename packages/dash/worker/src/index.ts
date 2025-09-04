import { Hono } from "hono";
import { logger } from "hono/logger";
import { bootstrap } from "./middleware/bootstrap";
import { cfMetadata } from "./middleware/cf-metadata";
import { noCache } from "./middleware/no-cache";
import { apiRoutes } from "./routes/api";
import { authRoutes } from "./routes/auth";

const app = new Hono()
  .use(logger())
  .use(cfMetadata())
  .use(noCache())
  .use(bootstrap())
  .route("/api", apiRoutes)
  .route("/auth", authRoutes);

export default app;

export type Routes = typeof app;
export type ApiRoutes = typeof apiRoutes;

import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { type ApiEnv, MyDurableObject } from "@openpromo/core/actors/index";

export class PendingContentPublishWorkflow extends WorkflowEntrypoint<
  ApiEnv["Bindings"],
  Params
> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    // Steps here
    console.log("Running cloudflare workflow");
    console.log({ event, step });
  }
}

export { MyDurableObject };
