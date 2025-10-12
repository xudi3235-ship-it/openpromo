import { EntStyleComponent } from "@core/domain/style-component";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { zValidator } from "../../../../../middleware/zod-validator";

export const createStyleRoute = new Hono<ApiEnv>().post(
  "/",
  zValidator(
    "json",
    EntStyleComponent.Schemas().create.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      creatorID: true,
    }),
  ),
  async (c) => {
    const payload = c.req.valid("json");

    const style = await EntStyleComponent.create({
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
      creatorID: Actor.userID(),
    });

    return c.json({ style: style.toJSON() });
  },
);
