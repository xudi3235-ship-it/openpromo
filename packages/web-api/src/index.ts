import { Hono } from "hono";
import { logger } from "hono/logger";
import { noCache } from "@/middleware/no-cache";
import { workOSAuth } from "@/middleware/workos-auth";
import { apiRoutes } from "@/routes/api";
import { authRoutes } from "@/routes/auth";
import type { MyEnv } from "@/types";

const app = new Hono<MyEnv>()
  .use(logger())
  .use(noCache())
  .use(workOSAuth())
  .route("/api", apiRoutes)
  .route("/auth", authRoutes);

export default app;

export type Routes = typeof app;
export type ApiRoutes = typeof apiRoutes;
