import { Binding } from "@core/helpers/api-env";
import { db } from "@core/helpers/db";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import { Log } from "@core/utils/log";
import { eq } from "drizzle-orm";

const log = Log.create({ namespace: "workspace-realtime" });

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

export async function dispatchWorkspaceEvent(
  workspaceId: string,
  event: unknown,
): Promise<void> {
  const workspaceSlug = await resolveWorkspaceSlug(workspaceId);
  if (!workspaceSlug) {
    log.warn("workspace slug not found for event", { workspaceId });
    return;
  }
  const bindings = Binding.use();
  try {
    const stub = bindings.WorkspacePusher.getByName(workspaceSlug);
    await stub.init(workspaceSlug);
    await stub.sendEvent(event);
  } catch (error) {
    log.warn("failed to dispatch workspace event", {
      workspaceSlug,
      error: (error as Error).message,
    });
  }
}
