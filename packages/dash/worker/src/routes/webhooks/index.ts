import type { ApiEnv } from "@openpromo/core/actors/index";
import { Hono } from "hono";
import { onError } from "../../helpers/error";
import { facebookWebhooksRoute } from "./facebook";

export const webhooksRoutes = new Hono<ApiEnv>()
  .route("/facebook", facebookWebhooksRoute)
  .onError(onError);
