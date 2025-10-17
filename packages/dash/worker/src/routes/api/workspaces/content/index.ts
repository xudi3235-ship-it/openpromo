import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { backfillRoute } from "./routes/backfill";
import { batchDeleteRoute } from "./routes/batch-delete";
import { contentGroupsRoute } from "./routes/content-groups";
import { createContentRoute } from "./routes/create-content";
import { deleteContentRoute } from "./routes/delete-content";
import { listContentRoute } from "./routes/list-content";
import { metricsRoute } from "./routes/metrics";

// Re-export types for external consumers
export type { ContentCreateData } from "./routes/create-content";
export type {
  ContentEntity,
  GroupEntity,
  MergedContentContainer,
  MergedContentEntity,
} from "./shared/types";

export const contentRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  .route("/", listContentRoute)
  .route("/create", createContentRoute)
  .route("/batch", batchDeleteRoute)
  .route("/group", contentGroupsRoute)
  .route("/content", deleteContentRoute)
  .route("/backfill", backfillRoute)
  .route("/metrics", metricsRoute);
