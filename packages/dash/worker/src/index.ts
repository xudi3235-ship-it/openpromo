import { Scheduler } from "@core/experimental/scheduler";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { bootstrap } from "./middleware/bootstrap";
import { cfMetadata } from "./middleware/cf-metadata";
import { noCache } from "./middleware/no-cache";
import { apiRoutes } from "./routes/api";
import { authRoutes } from "./routes/auth";
import { webhooksRoutes } from "./routes/webhooks";

const app = new Hono()
  .use(logger())
  .use(cfMetadata())
  .use(noCache())
  .use(bootstrap())
  .route("/api", apiRoutes)
  .route("/auth", authRoutes)
  .route("/webhooks", webhooksRoutes);
export default app;

export type Routes = typeof app;
export type ApiRoutes = typeof apiRoutes;

// bindings for DO, workflow, etc
export { Scheduler };

export * from "@openpromo/core/durable-objects";
export * from "@openpromo/core/workflows";
