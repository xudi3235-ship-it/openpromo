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
  PendingContentPublishWorkflow,
  Scheduler,
} from "@openpromo/core/actors/index";

// bindings for DO, workflow, etc
export { PendingContentPublishWorkflow, Scheduler };
