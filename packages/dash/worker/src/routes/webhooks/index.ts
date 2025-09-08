import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { onError } from "../../helpers/error";
import { facebookWebhooksRoute } from "./facebook";

export const webhooksRoutes = new Hono<ApiEnv>()
  .route("/facebook", facebookWebhooksRoute)
  .onError(onError);
