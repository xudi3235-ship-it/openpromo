import { Binding } from "@core/helpers/api-env";
import { db } from "@core/helpers/db";
import { workspacesTable } from "@core/schemas/workspaces.sql";
import { Log } from "@core/utils/log";
import type { WorkspaceEvent } from "@shared/workspace";
import { WorkspaceEventSchema } from "@shared/workspace";
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

/**
 * Dispatch a type-safe workspace event through WorkspacePusher
 * Events are validated against the WorkspaceEventSchema before being sent
 *
 * @param workspaceId - The workspace to dispatch the event to
 * @param event - The workspace event (will be validated)
 * @throws {ZodError} if the event doesn't match the schema
 */
export async function dispatchWorkspaceEvent(
  workspaceId: string,
  event: WorkspaceEvent,
): Promise<void> {
  // Validate the event against the schema
  const validatedEvent = WorkspaceEventSchema.parse(event);

  const workspaceSlug = await resolveWorkspaceSlug(workspaceId);
  if (!workspaceSlug) {
    log.warn("workspace slug not found for event", { workspaceId });
    return;
  }
  const bindings = Binding.use();
  try {
    const stub = bindings.WorkspacePusher.getByName(workspaceSlug);
    await stub.init(workspaceSlug);
    await stub.sendEvent(validatedEvent);
  } catch (error) {
    log.warn("failed to dispatch workspace event", {
      workspaceSlug,
      error: (error as Error).message,
    });
  }
}
