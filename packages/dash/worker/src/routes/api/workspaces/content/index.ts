import {
  EntFBFeedPendingContent,
  EntIGFeedPendingContent,
  EntPendingContent,
} from "@core/domain/content/entity/index";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { db } from "@core/helpers/db/db";
import { connectedAccount } from "@core/schemas/connected-account.sql";
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
  .get("/ig", async (c) => {
    const myIGAcc = "25159999793598036";
    const post = await EntIGFeedPendingContent._createDummy(myIGAcc);
    // const res = await post.createSinglePhotoPost();
    const res = await post.createPhotoCarouselPost();
    return c.json({ post, res });
  })
  .get("/reel", async (c) => {
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

    // 3. create a reel.
    const { video_id, upload_url } = await fbContent.initVideoUploadSession();
    // sample video
    await fbContent.uploadInternalVideoToSession(
      "0e859aa05d5af57db7b1d5888d6093ce",
      upload_url,
    );
    let attempts = 10;
    while (attempts > 0) {
      const status = await fbContent.getVideoStatus(video_id);
      attempts--;
      if (status.uploading_phase.status === "complete") {
        console.log("// video is ready");
        break;
      }
      console.log(`// ${attempts} video not ready yet, wait 5s`, status);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    // kick off publishing, at this point, video is upload_complete
    // next it will start processing, then publishing. we need to still poll
    // for the status and watch out for changes.
    const reel = await fbContent.createReel(video_id);
    return c.json({ video_id, reel });
  })
  // create, schedule, or draft a content x-plat.
  .post("/", zValidator("json", z.object({ text: z.string() })), async (c) => {
    return c.text("Not implemented");
  });
