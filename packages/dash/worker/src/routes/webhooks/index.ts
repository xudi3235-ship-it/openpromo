import type { ApiEnv } from "@openpromo/core/actors/index";
import { Hono } from "hono";
import { facebookWebhooksRoute } from "./facebook";

export const webhooksRoutes = new Hono<ApiEnv>().route(
  "/facebook",
  facebookWebhooksRoute,
);
