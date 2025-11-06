import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { onError } from "../../helpers/error";
import { facebookWebhooksRoute } from "./facebook-webhook-route";
import { instagramWebhooksRoute } from "./instagram-webhook-route";
import { tikTokBusinessWebhooksRoute } from "./tiktok-business-webhook-route";

export const webhooksRoutes = new Hono<ApiEnv>()
  .route("/facebook", facebookWebhooksRoute)
  .route("/instagram", instagramWebhooksRoute)
  .route("/tiktok-business", tikTokBusinessWebhooksRoute)
  .onError(onError);
