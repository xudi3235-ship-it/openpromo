import { EntUnifiedContent } from "@core/domain/content/entity/base";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { AppError } from "../../../../../helpers/error";

export const deleteContentRoute = new Hono<ApiEnv>().delete(
  "/:id",
  async (c) => {
    const { id } = c.req.param();
    const content = await EntUnifiedContent.fromID(id);
    if (!content)
      throw new AppError(404, { message: `Content ${id} not found` });
    const deleted = await content.delete();
    return c.json({ success: !!deleted });
  },
);
