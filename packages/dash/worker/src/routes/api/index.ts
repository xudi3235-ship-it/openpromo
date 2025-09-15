import type { ApiEnv } from "@core/helpers/api-env";
import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { onError } from "../../helpers/error";
import { workOSAuth } from "../../middleware/workos-auth";
import { connectedAccountsRoute } from "./connected-accounts";
import { examplesRoute } from "./examples";
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
  .route("/users", usersRoute)
  .route("/workspaces", workspacesRoute)
  .route("/orgs", orgsRoute)
  .route("/connected_accounts", connectedAccountsRoute)
  .route("/popup-relay", popupRelayRoute)
  .route("/ws", websocketsRoute)
  .onError(onError);

// specs
apiRoutes
  .get(
    "/openapi.json",
    openAPIRouteHandler(apiRoutes, {
      documentation: {
        info: {
          title: "OpenpPromo API",
          version: "0.0.1",
          description: "API documentation for OpenpPromo",
        },
      },
    }),
  )
  .get("/scalar", Scalar({ url: "/api/openapi.json" }));
