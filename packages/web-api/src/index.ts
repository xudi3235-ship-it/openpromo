import { Hono } from "hono";
import { logger } from "hono/logger";
import { cfMetadata } from "./middleware/cf-metadata";
import { noCache } from "./middleware/no-cache";
import { apiRoutes } from "./routes/api";
import { authRoutes } from "./routes/auth";

const app = new Hono()
  .use(logger())
  .use(cfMetadata())
  .use(noCache())
  .notFound((c) => c.redirect(`/?redirect_to=${c.req.path}`))
  .route("/api", apiRoutes)
  .route("/auth", authRoutes);

export default app;

export type Routes = typeof app;
export type ApiRoutes = typeof apiRoutes;
