import type { ApiEnv } from "@core/helpers/api-env";
import { scheduledHandler } from "@openpromo/core/cron";
import {
  type JobQueueMessage,
  processJobQueueBatch,
} from "@openpromo/core/queues/job-queue";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { bootstrap } from "./middleware/bootstrap";
import { cfMetadata } from "./middleware/cf-metadata";
import { logRequestBody } from "./middleware/log-request-body";
import { noCache } from "./middleware/no-cache";
import { apiRoutes } from "./routes/api";
import { authRoutes } from "./routes/auth";
import { openapiRoutes } from "./routes/openapi";
import { webhooksRoutes } from "./routes/webhooks";

const app = new Hono()
  .use(logger())
  .use(logRequestBody())
  .use(cfMetadata())
  .use(noCache())
  .use(bootstrap())
  .route("/api", apiRoutes)
  .route("/auth", authRoutes)
  .route("/openapi", openapiRoutes)
  .route("/webhooks", webhooksRoutes);

export default {
  fetch: app.fetch,
  scheduled: scheduledHandler,
  async queue(batch: MessageBatch<JobQueueMessage>, env: ApiEnv["Bindings"]) {
    await processJobQueueBatch(batch, env);
  },
};

export type Routes = typeof app;
export type ApiRoutes = typeof apiRoutes;

export * from "@openpromo/core/containers";
export * from "@openpromo/core/durable-objects";
export * from "@openpromo/core/workflows";
