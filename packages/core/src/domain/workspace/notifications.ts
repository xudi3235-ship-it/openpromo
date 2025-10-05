import { Binding } from "@core/helpers/api-env";
import { db } from "@core/helpers/db";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import { Log } from "@core/utils/log";
import type { WorkspaceNotification } from "@shared/workspace/notifications";
import { eq } from "drizzle-orm";

export type {
  WorkspaceNotification,
  WorkspaceNotificationEnvelope,
} from "@shared/workspace/notifications";
export {
  ContentFailedNotificationSchema,
  ContentPublishedNotificationSchema,
  WorkspaceNotificationEnvelopeSchema,
  WorkspaceNotificationSchema,
} from "@shared/workspace/notifications";

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

function normalizeTimestamp(timestamp?: Date | string): string {
  if (!timestamp) return new Date().toISOString();
  return typeof timestamp === "string"
    ? new Date(timestamp).toISOString()
    : timestamp.toISOString();
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

interface BaseContentNotificationParams {
  workspaceId: string;
  contentId: string;
  placement: string;
}

export async function notifyContentPublished(
  params: BaseContentNotificationParams & {
    sourceContentId?: string | null;
    shareUrl?: string | null;
    publishedAt?: Date | string;
  },
): Promise<void> {
  const notification: WorkspaceNotification = {
    type: "content.published",
    contentId: params.contentId,
    placement: params.placement,
    sourceContentId: params.sourceContentId ?? undefined,
    shareUrl: params.shareUrl ?? undefined,
    publishedAt: normalizeTimestamp(params.publishedAt),
  };

  await sendNotification(params.workspaceId, notification, {
    contentId: params.contentId,
  });
}

export async function notifyContentFailed(
  params: BaseContentNotificationParams & {
    errorMessage?: string;
    failedAt?: Date | string;
    groupId?: string | null;
    isGroupFullyFailed?: boolean;
  },
): Promise<void> {
  const notification: WorkspaceNotification = {
    type: "content.failed",
    contentId: params.contentId,
    placement: params.placement,
    errorMessage: params.errorMessage,
    failedAt: normalizeTimestamp(params.failedAt),
    groupId: params.groupId ?? undefined,
    isGroupFullyFailed: params.isGroupFullyFailed,
  };

  await sendNotification(params.workspaceId, notification, {
    contentId: params.contentId,
  });
}
