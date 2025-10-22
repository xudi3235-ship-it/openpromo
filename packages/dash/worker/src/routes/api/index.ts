import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { onError } from "../../helpers/error";
import { workOSAuth } from "../../middleware/workos-auth";
import { connectedAccountsRoute } from "./connected-accounts";
import { examplesRoute } from "./examples";
import { hashtagsRoute } from "./hashtags";
import { internalRoute } from "./internal";
import { orgsRoute } from "./orgs";
import { popupRelayRoute } from "./popup-relay";
import { usersRoute } from "./users";
import { websocketsRoute } from "./websockets";
import { workspacesRoute } from "./workspaces";
import { pingRoute } from "./workspaces/ping";

export const apiRoutes = new Hono<ApiEnv>()
  .use(workOSAuth())
  .route("/ping", pingRoute)
  .route("/examples", examplesRoute)
  .route("/hashtags", hashtagsRoute)
  .route("/internal", internalRoute)
  .route("/users", usersRoute)
  .route("/workspaces", workspacesRoute)
  .route("/orgs", orgsRoute)
  .route("/connected_accounts", connectedAccountsRoute)
  .route("/popup-relay", popupRelayRoute)
  .route("/ws", websocketsRoute)
  .onError(onError);
