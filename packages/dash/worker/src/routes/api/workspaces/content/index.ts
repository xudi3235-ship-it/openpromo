import {
  EntFBFeedPendingContent,
  EntIGFeedPendingContent,
  EntPendingContent,
} from "@core/domain/content/entity/index";
import {
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
} from "@core/domain/content/schema/placement";
import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { db } from "@core/helpers/db/db";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import {
  ContentPublishingStatusZod,
  PendingContentGroupSelect,
  pendingContentGroupTable,
  UnifiedContentSelect,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";

const listContentQuerySchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().default(3),
});

const GroupEntity = z.object({
  type: z.literal("group"),
  entity: PendingContentGroupSelect,
  contents: UnifiedContentSelect.array(),
});
const ContentEntity = z.object({
  type: z.literal("content"),
  entity: UnifiedContentSelect,
});
export type GroupEntity = z.infer<typeof GroupEntity>;
export type ContentEntity = z.infer<typeof ContentEntity>;
const MergedContentContainer = z.discriminatedUnion("type", [
  ContentEntity,
  GroupEntity,
]);
export type MergedContentEntity = z.infer<typeof MergedContentContainer>;

export type MergedContentContainer = z.infer<typeof MergedContentContainer>;
export async function createDummyPendingContent() {
  for (let i = 0; i < 5; i++) {
    await EntPendingContent._createDummy();
  }
}

export const contentRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  .get("/", zValidator("query", listContentQuerySchema), async (c) => {
    const { page, pageSize } = c.req.valid("query");
    // await createDummyPendingContent();
    const wsID = Actor.workspaceID();
    const raw = await db()
      .select()
      .from(unifiedContentTable)
      .leftJoin(
        pendingContentGroupTable,
        eq(
          unifiedContentTable.pendingContentGroupId,
          pendingContentGroupTable.id,
        ),
      )
      .where(and(eq(unifiedContentTable.workspaceId, wsID)))
      .orderBy(asc(unifiedContentTable.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Process and group by pendingContentGroupId
    const entities = raw.reduce<z.infer<typeof MergedContentContainer>[]>(
      (acc, row) => {
        const { unified_content, pending_content_group } = row;

        if (pending_content_group) {
          // Content belongs to a group - find existing group or create new one
          let existingGroup = acc.find(
            (entity) =>
              entity.type === "group" &&
              entity.entity.id === pending_content_group.id,
          );

          if (!existingGroup) {
            existingGroup = {
              type: "group",
              entity: pending_content_group,
              contents: [],
            };
            acc.push(existingGroup);
          }

          if (existingGroup.type === "group") {
            existingGroup.contents.push(unified_content);
          }
        } else {
          // Individual content (no group)
          acc.push({
            type: "content",
            entity: unified_content,
          });
        }

        return acc;
      },
      [],
    );

    return c.json({
      entities,
      pagination: { page, pageSize, total: entities.length },
    });
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
  .post(
    "/test",
    zValidator(
      "json",
      z.object({
        pageId: z.string(),
        message: z.string().optional(),
      }),
    ),
    async (c) => {
      c.req.valid("json");
    },
  )
  .post(
    "/create",
    zValidator(
      "json",
      z.object({
        base: z.object({
          publishingStatus: ContentPublishingStatusZod,
        }),
        placements: z
          .object({
            facebookFeed: FBFeedPlacementSpec.optional(),
            instagramFeed: IGFeedPlacementSpec.optional(),
          })
          .refine((val) => val.facebookFeed || val.instagramFeed, {
            message: "At least one placement must be provided.",
          }),
      }),
    ),
    async (c) => {
      const actor = Actor.assert("workspace_user");
      const { placements, base } = c.req.valid("json");
      const { publishingStatus } = base;
      // use group for draft
      if (publishingStatus in ["DRAFT"]) {
        const [group] = await db()
          .insert(pendingContentGroupTable)
          .values({
            workspaceId: actor.properties.workspaceID,
            publishingStatus,
          })
          .returning();
        if (placements.facebookFeed) {
          await EntPendingContent.createInternal({
            placement: "FB_FEED",
            placementSpec: placements.facebookFeed,
            publishingStatus,
            pendingContentGroupId: group.id,
            connectedAccountId: "TODO",
          });
        }
        if (placements.instagramFeed) {
          await EntPendingContent.createInternal({
            placement: "IG_FEED",
            placementSpec: placements.instagramFeed,
            publishingStatus,
            pendingContentGroupId: group.id,
            connectedAccountId: "TODO",
          });
        }
      }
      // else, create pending content directly
      if (publishingStatus in ["PUBLISH_NOW", "SCHEDULED"]) {
        if (placements.facebookFeed) {
          await EntPendingContent.createInternal({
            placement: "FB_FEED",
            placementSpec: placements.facebookFeed,
            publishingStatus,
            pendingContentGroupId: null, // no group
            connectedAccountId: "TODO",
          });
        }
        if (placements.instagramFeed) {
          await EntPendingContent.createInternal({
            placement: "IG_FEED",
            placementSpec: placements.instagramFeed,
            publishingStatus,
            pendingContentGroupId: null, // no group
            connectedAccountId: "TODO",
          });
        }
      }
      return c.json({ success: true });
    },
  );
