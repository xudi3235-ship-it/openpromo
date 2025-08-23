import { Hono } from "hono";
import { workOSAuth } from "../../middleware/workos-auth";
import type { ApiEnv } from "../../types";
import { orgsRoute } from "./orgs";
import { pingRoute } from "./ping";
import { usersRoute } from "./users";
import { workspacesRoute } from "./workspaces";

export const apiRoutes = new Hono<ApiEnv>()
  .use(workOSAuth())
  .route("/ping", pingRoute)
  .route("/users", usersRoute)
  .route("/workspaces", workspacesRoute)
  .route("/orgs", orgsRoute);
