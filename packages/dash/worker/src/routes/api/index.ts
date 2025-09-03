import { Hono } from "hono";
import { onError } from "../../helpers/error";
import { workOSAuth } from "../../middleware/workos-auth";
import type { ApiEnv } from "../../types";
import { examplesRoute } from "./examples";
import { orgsRoute } from "./orgs";
import { popupRelayRoute } from "./popup-relay";
import { usersRoute } from "./users";
import { workspacesRoute } from "./workspaces";
import { pingRoute } from "./workspaces/ping";

export const apiRoutes = new Hono<ApiEnv>()
  .use(workOSAuth())
  .route("/ping", pingRoute)
  .route("/examples", examplesRoute)
  .route("/users", usersRoute)
  .route("/workspaces", workspacesRoute)
  .route("/orgs", orgsRoute)
  .route("/popup-relay", popupRelayRoute)
  .onError(onError);
