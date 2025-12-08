import { Actor } from "@core/helpers/actor";
import { unifiedContentTable } from "@core/schemas/content.sql";
import { db } from "@openpromo/core/database/db";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { orpcBuilder } from "../../context";
import { withWorkspaceRole } from "../../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../../shared/workspace-helpers";

const getContentInput = createWorkspaceInputSchema(
  z.object({
    contentId: z.string().min(1),
  }),
);

export const getContent = orpcBuilder
  .input(getContentInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const workspaceId = Actor.workspaceID();
    const [content] = await db()
      .select()
      .from(unifiedContentTable)
      .where(
        and(
          eq(unifiedContentTable.workspaceId, workspaceId),
          eq(unifiedContentTable.id, input.contentId),
        ),
      )
      .limit(1);

    if (!content) {
      throw new Error("Content not found");
    }

    return { content };
  });
