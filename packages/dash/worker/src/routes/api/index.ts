import type { ApiEnv } from "@core/helpers/api-env";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import { Hono } from "hono";
import { onError } from "../../helpers/error";
import { workOSAuth } from "../../middleware/workos-auth";
import { type OrpcContext, orpcRouter } from "../../orpc";
import { agentsRoute } from "./agents";
import { connectRoute } from "./connect";
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

const handler = new RPCHandler<OrpcContext>(orpcRouter, {
  plugins: [new CORSPlugin()],
});

export const apiRoutes = new Hono<ApiEnv>()
  .use(workOSAuth())
  .use("/rpc/*", async (c, next) => {
    const { matched, response } = await handler.handle(c.req.raw, {
      prefix: "/api/rpc",
      context: {
        honoContext: c,
      },
    });

    if (matched) return c.newResponse(response.body, response);

    await next();
  })
  // connect rpc -> our grpc-compatible handler that exposes protobuf api
  // this is used by other internal services.
  .route("/connect", connectRoute)
  .route("/ping", pingRoute)
  .route("/agents", agentsRoute)
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
