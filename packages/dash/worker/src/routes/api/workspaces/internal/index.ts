import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { testMetricRefreshRoute } from "./test-metric-refresh";

// internal workspace-scoped routes, for testing and debugging
export const internalWorkspaceRoute = new Hono<ApiEnv>().route(
  "/metrics/refresh",
  testMetricRefreshRoute,
);
