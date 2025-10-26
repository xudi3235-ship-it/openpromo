import { WORKSPACE_PUSHER_USER_HEADER } from "@core/domain/workspace/workspace-pusher-headers";
import type { ApiEnv } from "@core/helpers/api-env";
import type { WorkspaceNotification } from "@shared/workspace/notifications";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../middleware/zod-validator";

/**
 * Workspace Pusher routes for WebSocket connections
 */
export const workspacePusherRoute = new Hono<ApiEnv>()
  // GET /workspaces/:workspaceSlug/pusher
  .get(
    "/:workspaceSlug/pusher",
    zValidator("param", z.object({ workspaceSlug: z.string() })),
    async (ctx) => {
      const { workspaceSlug } = ctx.req.valid("param");
      const user = ctx.get("user");

      if (!user) return ctx.json({ message: "Unauthorized" }, 401);

      console.log(`WebSocket connection for workspace: ${workspaceSlug}`);

      const pusher = ctx.env.WorkspacePusher.getByName(workspaceSlug);
      console.log(`WebSocket pusher DO ID: ${pusher.id}`);
      // Always initialize the workspace slug to ensure it's set correctly
      await pusher.init(workspaceSlug);

      const headers = new Headers(ctx.req.raw.headers);
      headers.set(WORKSPACE_PUSHER_USER_HEADER, user.id);

      const request = new Request(ctx.req.raw, { headers });

      return pusher.fetch(request);
    },
  )
  // POST /workspaces/:workspaceSlug/notifications/test
  .post(
    "/:workspaceSlug/notifications/test",
    zValidator("param", z.object({ workspaceSlug: z.string() })),
    async (ctx) => {
      const { workspaceSlug } = ctx.req.valid("param");

      const pusher = ctx.env.WorkspacePusher.getByName(workspaceSlug);
      await pusher.init(workspaceSlug);

      const now = Date.now();

      const notification: WorkspaceNotification = {
        type: "content.published",
        contentId: `dummy-${now}`,
        placement: "realtime.playground",
        publishedAt: new Date(now).toISOString(),
        sourceContentId: null,
        shareUrl: "https://openpromo.app",
      };

      await pusher.sendNotification(notification);

      return ctx.json({
        notification: {
          type: "notification" as const,
          workspaceSlug,
          timestamp: now,
          notification,
        },
      });
    },
  )
  // GET /workspaces/:workspaceSlug/notifications
  .get(
    "/:workspaceSlug/notifications",
    zValidator("param", z.object({ workspaceSlug: z.string() })),
    async (ctx) => {
      const { workspaceSlug } = ctx.req.valid("param");

      const pusher = ctx.env.WorkspacePusher.getByName(workspaceSlug);
      await pusher.init(workspaceSlug);

      const notifications = await pusher.listNotifications();
      const envelopes = notifications.map((record) => ({
        type: "notification" as const,
        workspaceSlug: record.workspaceSlug,
        timestamp: record.createdAt,
        notification: record.notification,
      }));

      return ctx.json({ notifications: envelopes });
    },
  )
  // POST /workspaces/:workspaceSlug/pusher/message/:userId
  .post(
    "/:workspaceSlug/pusher/message/:userId",
    zValidator(
      "param",
      z.object({
        workspaceSlug: z.string(),
        userId: z.string(),
      }),
    ),
    zValidator("json", z.object({ message: z.string() })),
    async (ctx) => {
      const { workspaceSlug, userId } = ctx.req.valid("param");
      const { message } = ctx.req.valid("json");

      console.log(
        `Sending message to workspace: ${workspaceSlug}, user: ${userId}`,
      );

      const pusher = ctx.env.WorkspacePusher.getByName(workspaceSlug);
      console.log(`Message pusher DO ID: ${pusher.id}`);
      // Ensure the pusher is initialized with the correct workspace slug
      await pusher.init(workspaceSlug);

      if (userId === "all") {
        await pusher.sendMessageToAllUsers(message);
        return ctx.json({ message: "Message sent to all users" });
      } else {
        await pusher.sendMessageToUser(userId, message);
        return ctx.json({ message: "Message sent to user" });
      }
    },
  );
