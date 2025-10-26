import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";
import { connectedAccountsRoute } from "./connected-accounts";
import { contentRoute } from "./content";
import { createWorkspaceRoute } from "./create-workspace";
import { deleteWorkspaceRoute } from "./delete-workspace";
import { getWorkspaceRoute } from "./get-workspace";
import { imageGenRoute } from "./image-gen";
import { inboxRoute } from "./inbox";
import { insightsRoute } from "./insights";
import { internalWorkspaceRoute } from "./internal";
import { listWorkspacesRoute } from "./list-workspaces";
import { mediaRoute } from "./media";
import { platformSearchRoute } from "./platform-search";
import { productsRoute } from "./products";
import { storageRoute } from "./storage";
import { stylesRoute } from "./styles";
import { workspaceTeamRoute } from "./team";
import { updateWorkspaceRoute } from "./update-workspace";
import { workspacePusherRoute } from "./workspace-pusher";

/**
 * Main workspaces router
 * Composed from individual route handlers for better organization
 */
export const workspacesRoute = new Hono<ApiEnv>()
  .use(withAuth())
  // Workspace CRUD operations
  .route("/", listWorkspacesRoute)
  .route("/", getWorkspaceRoute)
  .route("/", updateWorkspaceRoute)
  .route("/", createWorkspaceRoute)
  .route("/", deleteWorkspaceRoute)
  // WebSocket pusher routes
  .route("/", workspacePusherRoute)
  // Internal testing routes
  .route("/:workspaceSlug/internal", internalWorkspaceRoute)
  // Nested resource routes
  .route("/:workspaceSlug/connected_accounts", connectedAccountsRoute)
  .route("/:workspaceSlug/inbox", inboxRoute)
  .route("/:workspaceSlug/media", mediaRoute)
  .route("/:workspaceSlug/image-gen", imageGenRoute)
  .route("/:workspaceSlug/storage", storageRoute)
  .route("/:workspaceSlug/team", workspaceTeamRoute)
  .route("/:workspaceSlug/content", contentRoute)
  .route("/:workspaceSlug/products", productsRoute)
  .route("/:workspaceSlug/platform-search", platformSearchRoute)
  .route("/:workspaceSlug/styles", stylesRoute)
  .route("/:workspaceSlug/insights", insightsRoute);
