import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { testAnalyticsWriteRoute } from "./test-analytics-write";
import { testBackfillRoute } from "./test-backfill";
import { testMetricRefreshRoute } from "./test-metric-refresh";

// internal workspace-scoped routes, for testing and debugging
export const internalWorkspaceRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_admin"))
  .route("/backfill", testBackfillRoute)
  .route("/metrics/refresh", testMetricRefreshRoute)
  .route("/analytics/test-write", testAnalyticsWriteRoute);
