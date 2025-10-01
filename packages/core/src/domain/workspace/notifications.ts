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

export async function notifyContentPublished(params: {
  workspaceId: string;
  contentId: string;
  placement: string;
  sourceContentId?: string | null;
  shareUrl?: string | null;
  publishedAt?: Date | string;
}): Promise<void> {
  const workspaceSlug = await resolveWorkspaceSlug(params.workspaceId);
  if (!workspaceSlug) {
    log.warn("workspace slug not found for notification", {
      workspaceId: params.workspaceId,
      contentId: params.contentId,
    });
    return;
  }

  const publishedAtIso =
    typeof params.publishedAt === "string"
      ? new Date(params.publishedAt).toISOString()
      : (params.publishedAt ?? new Date()).toISOString();

  const notification: WorkspaceNotification = {
    type: "content.published",
    contentId: params.contentId,
    placement: params.placement,
    sourceContentId: params.sourceContentId ?? undefined,
    shareUrl: params.shareUrl ?? undefined,
    publishedAt: publishedAtIso,
  };

  await dispatchWorkspaceNotification(workspaceSlug, notification);
}
