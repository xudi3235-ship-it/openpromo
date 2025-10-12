import { EntStyleComponent } from "@core/domain/style-component";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const paramsSchema = z.object({
  styleId: z.string(),
});

export const getStyleRoute = new Hono<ApiEnv>().get(
  "/:styleId",
  zValidator("param", paramsSchema),
  async (c) => {
    const { styleId } = c.req.valid("param");

    const style = await EntStyleComponent.fromID(styleId);

    return c.json({ style: style.toJSON() });
  },
);
