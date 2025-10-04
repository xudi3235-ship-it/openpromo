import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { onError } from "../../helpers/error";
import { facebookWebhooksRoute } from "./facebook";
import { instagramWebhooksRoute } from "./instagram";

export const webhooksRoutes = new Hono<ApiEnv>()
  .route("/facebook", facebookWebhooksRoute)
  .route("/instagram", instagramWebhooksRoute)
  .onError(onError);
