import { EntUnifiedContent } from "@core/domain/content/entity/EntUnifiedContent";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { createVisibleError } from "../../../../../helpers/error";

export const deleteContentRoute = new Hono<ApiEnv>().delete(
  "/:id",
  async (c) => {
    const { id } = c.req.param();
    const content = await EntUnifiedContent.fromID(id);
    if (!content)
      throw createVisibleError(404, { message: `Content ${id} not found` });
    const deleted = await content.delete();
    return c.json({ success: !!deleted });
  },
);
