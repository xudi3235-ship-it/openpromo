import { Hono } from "hono";
import { logger } from "hono/logger";
import { noCache } from "@/middleware/no-cache";
import { apiRoutes } from "@/routes/api";
import { authRoutes } from "@/routes/auth";

const app = new Hono()
  .use(logger())
  .use(noCache())
  .route("/api", apiRoutes)
  .route("/auth", authRoutes);

export default app;

export type Routes = typeof app;
export type ApiRoutes = typeof apiRoutes;
