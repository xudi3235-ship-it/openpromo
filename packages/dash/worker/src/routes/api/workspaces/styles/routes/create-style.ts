import { EntStyleComponent } from "@core/domain/style-component";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { zValidator } from "../../../../../middleware/zod-validator";

export const createStyleRoute = new Hono<ApiEnv>().post(
  "/",
  zValidator("json", EntStyleComponent.Schemas().create),
  async (c) => {
    const payload = c.req.valid("json");

    const style = await EntStyleComponent.create(payload);

    return c.json({ style: style.toJSON() });
  },
);
