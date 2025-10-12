import { EntStyleComponent } from "@core/domain/style-component";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const paramsSchema = z.object({
  styleId: z.string(),
});

export const deleteStyleRoute = new Hono<ApiEnv>().delete(
  "/:styleId",
  zValidator("param", paramsSchema),
  async (c) => {
    const { styleId } = c.req.valid("param");

    const style = await EntStyleComponent.fromID(styleId);
    await style.delete();

    return c.json({ styleId });
  },
);
