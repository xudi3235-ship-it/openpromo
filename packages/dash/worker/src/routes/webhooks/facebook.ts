import type { ApiEnv } from "@openpromo/core/actors/index";
import { env } from "@openpromo/core/utils/env";
import { Hono } from "hono";
import * as z from "zod";
import { AppError } from "../../helpers/error";
import { zValidator } from "../../middleware/zod-validator";

const facebookWebhooksQuerySchema = z.object({
  "hub.mode": z.literal("subscribe"),
  "hub.challenge": z.string(),
  "hub.verify_token": z.string(),
});

export const facebookWebhooksRoute = new Hono<ApiEnv>().get(
  "/",
  zValidator("query", facebookWebhooksQuerySchema),
  (c) => {
    const { "hub.challenge": challenge, "hub.verify_token": verifyToken } =
      c.req.valid("query");

    if (verifyToken !== env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
      throw new AppError(400, {
        message: "Invalid facebook webhook verify token",
      });
    }

    return c.text(challenge);
  },
);
