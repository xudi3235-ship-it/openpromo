import type { ApiEnv } from "@core/helpers/api-env";
import { Log } from "@core/utils/log";
import { Hono } from "hono";

const log = Log.create({ namespace: "tiktok-business-webhook" });

export const tikTokBusinessWebhooksRoute = new Hono<ApiEnv>()
  .get("/", async (c) => {
    const challenge = c.req.query("challenge");
    if (!challenge) {
      return c.json(
        { success: false, error: "Missing challenge parameter" },
        400,
      );
    }
    return c.text(challenge);
  })
  .post("/", async (c) => {
    try {
      const payload = await c.req.json();
      log.info("Received TikTok Business webhook event", { payload });
      return c.json({ success: true });
    } catch (error) {
      console.error("Failed to process TikTok Business webhook event", {
        error: (error as Error).message,
      });
      return c.json({ success: false }, 500);
    }
  });
