import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";
import { agentsRoute } from "../agents";
import { connectedAccountsRoute } from "./connected-accounts";
import { contentRoute } from "./content";
import { inboxRoute } from "./inbox";
import { internalWorkspaceRoute } from "./internal";
import { mediaRoute } from "./media";
import { storageRoute } from "./storage";
import { workspaceTeamRoute } from "./team";
import { workspacePusherRoute } from "./workspace-pusher";

/**
 * Main workspaces router
 * Composed from individual route handlers for better organization
 *
 * Note: Workspace CRUD operations (list, get, create, update, delete) have been
 * migrated to oRPC. See /orpc/routes/workspaces.ts
 */
export const workspacesRoute = new Hono<ApiEnv>()
  .use(withAuth())
  // WebSocket pusher routes
  .route("/", workspacePusherRoute)
  // Internal testing routes
  .route("/:workspaceSlug/internal", internalWorkspaceRoute)
  // Nested resource routes
  .route("/:workspaceSlug/connected_accounts", connectedAccountsRoute)
  .route("/:workspaceSlug/inbox", inboxRoute)
  .route("/:workspaceSlug/media", mediaRoute)
  .route("/:workspaceSlug/storage", storageRoute)
  .route("/:workspaceSlug/team", workspaceTeamRoute)
  .route("/:workspaceSlug/content", contentRoute)
  .route("/:workspaceSlug/agents", agentsRoute);
