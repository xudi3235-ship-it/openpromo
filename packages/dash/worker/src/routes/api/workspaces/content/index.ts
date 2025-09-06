import { zValidator } from "@hono/zod-validator";
import { Actor } from "@openpromo/core/actor";
import type { ApiEnv } from "@openpromo/core/actors/index";
import { EntPendingContent } from "@openpromo/core/domain/content/entity/index";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";

export const contentRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  .get("/", async (c) => {
    // tests our schedule flow
    // 1. create a dummy content
    const content = await EntPendingContent._createDummy();
    const id = content.data.id;
    // 2. trigger the publish workflow
    const wf = await c.env.WORKFLOW.create({
      id,
      params: {
        actor: Actor.assert("workspace_user"),
        pendingContentID: id,
      },
    });
    return c.json({ content, wf });
  })
  // create, schedule, or draft a content x-plat.
  .post("/", zValidator("json", z.object({ text: z.string() })), async (c) => {
    return c.text("Not implemented");
  });
