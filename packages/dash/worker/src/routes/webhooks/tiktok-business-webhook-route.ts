import { handleTikTokBusinessCommentEvent } from "@core/domain/inbox/webhooks/tiktok-business-comments";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Log } from "@core/utils/log";
import {
  TikTokCommentUpdateEvent,
  type TikTokCommentUpdateEventType,
} from "@shared/inbox";
import { ORGANIZATION_ROLE, WORKSPACE_ROLE } from "@shared/workspace/auth";
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
    let payload: unknown;
    try {
      payload = await c.req.json();
    } catch (error) {
      log.warn("Invalid TikTok Business webhook payload", {
        error: (error as Error).message,
      });
      return c.json({ success: false, error: "invalid payload" }, 400);
    }

    if (typeof payload !== "object" || payload === null) {
      log.warn("Unsupported TikTok Business webhook payload", { payload });
      return c.json({ success: true });
    }

    const candidates: unknown[] = [];
    if ("events" in payload && Array.isArray(payload.events)) {
      candidates.push(...payload.events);
    }
    if ("event" in payload) {
      candidates.push((payload as Record<string, unknown>).event);
    }
    if ("data" in payload && typeof payload.data === "object") {
      candidates.push(payload.data);
    }
    candidates.push(payload);

    const parsedEvents: TikTokCommentUpdateEventType[] = [];
    for (const candidate of candidates) {
      const parsed = TikTokCommentUpdateEvent.safeParse(candidate);
      if (parsed.success && parsed.data.event_type === "comment.update") {
        parsedEvents.push(parsed.data);
      }
    }

    if (parsedEvents.length === 0) {
      log.info("No TikTok comment events detected", { payload });
      return c.json({ success: true });
    }

    const actor = Actor.create("workspace_user", {
      workspaceID: "tiktok-webhook",
      workspaceSlug: "tiktok-webhook",
      workspacePermissions: [],
      workspaceRole: WORKSPACE_ROLE.ADMIN,
      userID: "tiktok-webhook",
      dbUserID: "tiktok-webhook",
      email: "webhook@openpromo.app",
      organizationID: "tiktok-webhook",
      role: ORGANIZATION_ROLE.ADMIN,
      featureFlags: [],
      permissions: [],
    });

    try {
      await Actor.provide(actor.type, actor.properties, async () => {
        for (const event of parsedEvents) {
          await handleTikTokBusinessCommentEvent(event);
        }
      });
      return c.json({ success: true });
    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error(String(error ?? "unknown error"));
      log.error(err);
      return c.json({ success: false }, 500);
    }
  });
