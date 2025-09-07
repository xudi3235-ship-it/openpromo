import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";
import { facebookConnectedAccountRoute } from "./facebook";
import { instagramConnectedAccountRoute } from "./instagram";

export const connectedAccountsRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .route("/facebook", facebookConnectedAccountRoute)
  .route("/instagram", instagramConnectedAccountRoute);
