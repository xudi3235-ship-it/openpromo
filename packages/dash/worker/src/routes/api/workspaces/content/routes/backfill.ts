import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../../../../../middleware/zod-validator";

const BackfillRequestSchema = z.object({
  connectedAccountID: z.string(),
  start: z.string().datetime(),
  end: z.string().datetime(),
});

export const backfillRoute = new Hono<ApiEnv>().post(
  "/",
  zValidator("json", BackfillRequestSchema),
  async (c) => {
    // starts workflow for backfilling content
    // it will create unified content entries
    // from source platform
    const payload = c.req.valid("json");
    const actor = Actor.assert("workspace_user");
    const instance = await c.env.ContentBackfillWorkflow.create({
      params: {
        actor,
        ...payload,
      },
    });
    return c.json({ id: instance.id, status: await instance.status() });
  },
);
