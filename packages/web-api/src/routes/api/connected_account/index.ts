import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";
import type { ApiEnv } from "../../../types";
import { facebookConnectedAccountRoute } from "./facebook";

export const connectedAccountRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .route("/facebook", facebookConnectedAccountRoute);
