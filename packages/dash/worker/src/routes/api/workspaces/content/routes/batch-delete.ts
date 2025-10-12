import { EntUnifiedContent } from "@core/domain/content/entity/EntUnifiedContent";
import { EntPendingContentGroup } from "@core/domain/content/entity/index";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { db } from "@core/helpers/db/db";
import {
  pendingContentGroupTable,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const BatchDeleteRequestSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one ID is required"),
  type: z.enum(["content", "group", "mixed"]).optional().default("mixed"),
});

export const batchDeleteRoute = new Hono<ApiEnv>().delete(
  "/",
  zValidator("json", BatchDeleteRequestSchema),
  async (c) => {
    const { ids } = c.req.valid("json");
    const actor = Actor.assert("workspace_user");

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        // Try to find if it's a content group first
        const groups = await db()
          .select({ id: pendingContentGroupTable.id })
          .from(pendingContentGroupTable)
          .where(
            and(
              eq(pendingContentGroupTable.id, id),
              eq(
                pendingContentGroupTable.workspaceId,
                actor.properties.workspaceID,
              ),
            ),
          )
          .limit(1);

        if (groups.length > 0) {
          // It's a group - delete it
          return await EntPendingContentGroup.deleteByID(id);
        }

        // Try to find if it's individual content
        const contents = await db()
          .select({ id: unifiedContentTable.id })
          .from(unifiedContentTable)
          .where(
            and(
              eq(unifiedContentTable.id, id),
              eq(unifiedContentTable.workspaceId, actor.properties.workspaceID),
            ),
          )
          .limit(1);

        if (contents.length > 0) {
          // It's individual content - delete it
          const content = await EntUnifiedContent.fromID(id);
          return content ? await content.delete() : false;
        }

        throw new Error(`Item with ID ${id} not found`);
      }),
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value,
    ).length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason?.message || "Unknown error");

    return c.json({
      success: failed === 0,
      deleted: successful,
      failed: failed,
      errors: errors,
      total: ids.length,
    });
  },
);
