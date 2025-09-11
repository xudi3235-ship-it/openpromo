import { hc } from "hono/client";
import type { apiRoutes } from "./routes/api";
import type { authRoutes } from "./routes/auth";

export type TypedApiClient = ReturnType<typeof hc<typeof apiRoutes>>;
export const hcWithType = (...args: Parameters<typeof hc>): TypedApiClient =>
  hc<typeof apiRoutes>(...args);
export type ApiRoutes = typeof apiRoutes;
export type AuthRoutes = typeof authRoutes;
