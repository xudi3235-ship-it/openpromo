import type { ApiEnv } from "@openpromo/core/actors/index";
import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";
import { facebookConnectedAccountRoute } from "./facebook";

export const connectedAccountsRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .route("/facebook", facebookConnectedAccountRoute);
