import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";
import { facebookConnectedAccountRoute } from "./facebook-oauth-callback-route";
import { instagramConnectedAccountRoute } from "./instagram-oauth-callback-route";
import { tikTokBusinessConnectedAccountRoute } from "./tiktok-business-oauth-callback-route";
import { tikTokConnectedAccountRoute } from "./tiktok-oauth-callback-route";

export const connectedAccountsRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .route("/facebook", facebookConnectedAccountRoute)
  .route("/instagram", instagramConnectedAccountRoute)
  .route("/tiktok", tikTokConnectedAccountRoute)
  .route("/tiktok_business", tikTokBusinessConnectedAccountRoute);
