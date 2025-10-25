import { Event } from "@core/experimental/bus/def";
import { Binding } from "@core/helpers/api-env";
import { db } from "@core/helpers/db";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import { Log } from "@core/utils/log";
import type { WorkspaceNotification } from "@shared/workspace/notifications";
import { eq } from "drizzle-orm";

export type {
  WorkspaceNotification,
  WorkspaceNotificationEnvelope,
  WorkspaceNotificationRecord,
} from "@shared/workspace/notifications";

import {
  ContentFailedNotificationSchema,
  ContentPublishedNotificationSchema,
} from "@shared/workspace/notifications";

export {
  ContentFailedNotificationSchema,
  ContentPublishedNotificationSchema,
  WorkspaceNotificationEnvelopeSchema,
  WorkspaceNotificationRecordSchema,
  WorkspaceNotificationSchema,
} from "@shared/workspace/notifications";

// ============ Notification Definition System ============

const defineNotif = Event.builder({
  validator: Event.zodValidator,
  metadata: (_type: string, _properties: unknown) => ({}),
});

// ============ Notification Definitions ============

export const ContentPublished = defineNotif(
  "content.published",
  ContentPublishedNotificationSchema.omit({ type: true }),
);

export const ContentFailed = defineNotif(
  "content.failed",
  ContentFailedNotificationSchema.omit({ type: true }),
);

const log = Log.create({ namespace: "workspace-notifications" });

const workspaceSlugCache = new Map<string, string>();

async function resolveWorkspaceSlug(
  workspaceId: string,
): Promise<string | null> {
  if (!workspaceId) return null;
  const cached = workspaceSlugCache.get(workspaceId);
  if (cached) return cached;

  const [workspace] = await db()
    .select({ slug: workspacesTable.slug })
    .from(workspacesTable)
    .where(eq(workspacesTable.id, workspaceId))
    .limit(1);

  if (!workspace) return null;
  workspaceSlugCache.set(workspaceId, workspace.slug);
  return workspace.slug;
}

async function sendNotification<T extends WorkspaceNotification>(
  workspaceId: string,
  notification: T,
  context?: { contentId?: string },
): Promise<void> {
  const workspaceSlug = await resolveWorkspaceSlug(workspaceId);
  if (!workspaceSlug) {
    log.warn("workspace slug not found for notification", {
      workspaceId,
      ...context,
    });
    return;
  }

  await dispatchWorkspaceNotification(workspaceSlug, notification);
}

// ============ Unified Notification API ============

export const WorkspaceNotif = {
  async send<TDef extends Event.Definition>(
    workspaceId: string,
    definition: TDef,
    params: TDef["$input"],
  ): Promise<void> {
    // Create and validate using Event system
    const payload = await definition.create(params);

    const notification: WorkspaceNotification = {
      type: payload.type,
      ...payload.properties,
    } as WorkspaceNotification;

    await sendNotification(workspaceId, notification, {
      contentId:
        "contentId" in payload.properties
          ? String(payload.properties.contentId)
          : undefined,
    });
  },
};

export async function dispatchWorkspaceNotification(
  workspaceSlug: string,
  notification: WorkspaceNotification,
): Promise<void> {
  if (!workspaceSlug) return;
  const bindings = Binding.use();
  try {
    const stub = bindings.WorkspacePusher.getByName(workspaceSlug);
    await stub.init(workspaceSlug);
    await stub.sendNotification(notification);
  } catch (error) {
    log.warn("failed to dispatch workspace notification", {
      workspaceSlug,
      notification,
      error: (error as Error).message,
    });
  }
}
