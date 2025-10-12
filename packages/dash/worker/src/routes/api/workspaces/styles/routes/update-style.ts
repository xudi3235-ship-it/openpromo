import { EntStyleComponent } from "@core/domain/style-component";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const paramsSchema = z.object({
  styleId: z.string(),
});

export const updateStyleRoute = new Hono<ApiEnv>().patch(
  "/:styleId",
  zValidator("param", paramsSchema),
  zValidator("json", EntStyleComponent.Schemas().update),
  async (c) => {
    const { styleId } = c.req.valid("param");
    const payload = c.req.valid("json");

    const style = await EntStyleComponent.fromID(styleId);
    await style.update(payload);

    return c.json({ style: style.toJSON() });
  },
);
