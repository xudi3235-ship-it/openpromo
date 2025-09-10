import {
  EntFBFeedPendingContent,
  EntIGFeedPendingContent,
  EntPendingContent,
} from "@core/domain/content/entity/index";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { db } from "@core/helpers/db/db";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import { pendingContentGroupTable } from "@core/schemas/content.sql";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";

const listContentQuerySchema = z.object({
  page: z.number().default(1),
  pageSize: z.number().default(20),
});

export const contentRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  .get("/", zValidator("query", listContentQuerySchema), async (c) => {
    // this will be a paginated list of contents, with filters, etc.
    // used by content table view as well as calendar view.
    // it returns a merged list of published, scheduled, draft contents.
    // for pending contents, it use pending group
    const { page, pageSize } = c.req.valid("query");
    // 1. fetch all pending contents
    const pendingContents = await db()
      .select()
      .from(pendingContentGroupTable)
      .where(eq(pendingContentGroupTable.workspaceId, Actor.workspaceID()))
      .orderBy(asc(pendingContentGroupTable.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    console.log({ pendingContents });
    // 2. fetch published contents using ents
    // 3. merge, sort
    return c.text("List content - Not implemented");
  })
  .get("/schedule", async (c) => {
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
    // const res = await post.createPhotoCarouselPost();
    const res = await post.createReel();
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
      // "0e859aa05d5af57db7b1d5888d6093ce",
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
