import {
  EntFBFeedPendingContent,
  EntPendingContent,
} from "@openpromo/core/domain/content/entity/index";
import { Actor } from "@openpromo/core/helpers/actor";
import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import { db } from "@openpromo/core/helpers/db/db";
import { connectedAccount } from "@openpromo/core/schemas/connected-account.sql";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";

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
  // create text post
  .get("/text", async (c) => {
    const myPageId = "198964309975614"; // my test page.
    // 1. load our FB account
    const [acc] = await db()
      .select()
      .from(connectedAccount)
      .where(
        and(
          eq(connectedAccount.platform, "FACEBOOK"),
          eq(connectedAccount.workspaceId, Actor.workspaceID()),
          eq(connectedAccount.externalAccountId, myPageId), // my test page.
        ),
      )
      .limit(1);
    console.log({ acc });
    // 2. create a dummy pending content
    const content = await EntPendingContent._createDummy(acc.externalAccountId);
    const fbContent = EntFBFeedPendingContent.fromPendingContent(content);
    // 3. publish it to page
    await fbContent.createTextPost();
    return c.json({ acc });
  })
  // create, schedule, or draft a content x-plat.
  .post("/", zValidator("json", z.object({ text: z.string() })), async (c) => {
    return c.text("Not implemented");
  });
