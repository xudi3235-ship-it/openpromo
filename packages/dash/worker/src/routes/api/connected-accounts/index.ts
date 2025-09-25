import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";
import { facebookConnectedAccountRoute } from "./facebook";
import { instagramConnectedAccountRoute } from "./instagram";
import { tikTokConnectedAccountRoute } from "./tiktok";

export const connectedAccountsRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .route("/facebook", facebookConnectedAccountRoute)
  .route("/instagram", instagramConnectedAccountRoute)
  .route("/tiktok", tikTokConnectedAccountRoute);
