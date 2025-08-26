import { Hono } from "hono";
import { onError } from "../../helpers/error";
import { workOSAuth } from "../../middleware/workos-auth";
import type { ApiEnv } from "../../types";
import { connectedAccountRoute } from "./connected_account";
import { orgsRoute } from "./orgs";
import { pingRoute } from "./ping";
import { usersRoute } from "./users";
import { workspacesRoute } from "./workspaces";

export const apiRoutes = new Hono<ApiEnv>()
  .use(workOSAuth())
  .route("/ping", pingRoute)
  .route("/users", usersRoute)
  .route("/workspaces", workspacesRoute)
  .route("/orgs", orgsRoute)
  .route("/connected_accounts", connectedAccountRoute)
  .onError(onError);
