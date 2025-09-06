import { zValidator } from "@hono/zod-validator";
import type { ApiEnv } from "@openpromo/core/actors/index";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";

export const contentRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  // create, schedule, or draft a content x-plat.
  .post("/", zValidator("json", z.object({ text: z.string() })), async (c) => {
    return c.text("not ready lol");
  });
