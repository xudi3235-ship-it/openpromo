import {
  EntFBFeedPendingContent,
  EntIGFeedPendingContent,
  EntPendingContent,
  EntPendingContentGroup,
} from "@core/domain/content/entity/index";

import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { db } from "@core/helpers/db/db";
import { connectedAccount } from "@core/schemas/connected-account.sql";
import {
  BasePlacementSpec,
  FBFeedPlacementSpec,
  IGFeedPlacementSpec,
  PendingContentGroupSelect,
  pendingContentGroupTable,
  UnifiedContentSelect,
  unifiedContentTable,
} from "@core/schemas/content.sql";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { AppError } from "packages/dash/worker/src/helpers/error";
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

export const ContentCreateData = z.object({
  base: BasePlacementSpec,
  placements: z
    .object({
      facebookFeed: FBFeedPlacementSpec.array().optional(),
      instagramFeed: IGFeedPlacementSpec.array().optional(),
    })
    .refine((val) => val.facebookFeed || val.instagramFeed, {
      message: "At least one placement must be provided.",
    }),
});
export type ContentCreateData = z.infer<typeof ContentCreateData>;

export const contentRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  // list content api
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
  // create content api
  .post("/create", zValidator("json", ContentCreateData), async (c) => {
    const actor = Actor.assert("workspace_user");
    const { placements, base } = c.req.valid("json");
    const { publishingStatus } = base;
    // use group for draft
    if (publishingStatus === "DRAFT") {
      const [group] = await db()
        .insert(pendingContentGroupTable)
        .values({
          workspaceId: actor.properties.workspaceID,
          publishingStatus,
          pendingContentGroupSpec: {
            baseMessage: base.message,
            baseAttachments: base.attachments,
            baseSchedulingSpec: base.schedulingSpec,
          },
        })
        .returning();
      // TODO: migrate to use inset many operations instead.
      if (placements.facebookFeed) {
        for (const spec of placements.facebookFeed) {
          await EntPendingContent.createInternal({
            placement: "FB_FEED",
            placementSpec: spec,
            publishingStatus,
            pendingContentGroupId: group.id,
            connectedAccountId: spec.identity.connectedAccountID,
          });
        }
      }
      if (placements.instagramFeed) {
        for (const spec of placements.instagramFeed) {
          await EntPendingContent.createInternal({
            placement: "IG_FEED",
            placementSpec: spec,
            publishingStatus,
            pendingContentGroupId: group.id,
            connectedAccountId: spec.identity.connectedAccountID,
          });
        }
      }
      return c.json({ success: true, groupId: group.id });
    }
    // For scheduled content, also create a group to maintain base data consistency
    if (publishingStatus === "SCHEDULED") {
      const [group] = await db()
        .insert(pendingContentGroupTable)
        .values({
          workspaceId: actor.properties.workspaceID,
          publishingStatus,
          pendingContentGroupSpec: {
            baseMessage: base.message,
            baseAttachments: base.attachments,
            baseSchedulingSpec: base.schedulingSpec,
          },
        })
        .returning();

      // Create content linked to group
      if (placements.facebookFeed) {
        for (const spec of placements.facebookFeed) {
          await EntPendingContent.createInternal({
            placement: "FB_FEED",
            placementSpec: spec,
            publishingStatus,
            pendingContentGroupId: group.id,
            connectedAccountId: spec.identity.connectedAccountID,
          });
        }
      }
      if (placements.instagramFeed) {
        for (const spec of placements.instagramFeed) {
          await EntPendingContent.createInternal({
            placement: "IG_FEED",
            placementSpec: spec,
            publishingStatus,
            pendingContentGroupId: group.id,
            connectedAccountId: spec.identity.connectedAccountID,
          });
        }
      }
      return c.json({ success: true, groupId: group.id });
    }
    // For immediate publishing, create content directly without groups
    if (publishingStatus === "PUBLISH_NOW") {
      if (placements.facebookFeed) {
        for (const spec of placements.facebookFeed) {
          console.log({ spec });
          await EntPendingContent.createInternal({
            placement: "FB_FEED",
            placementSpec: spec,
            publishingStatus,
            pendingContentGroupId: null, // no group for immediate publish
            connectedAccountId: spec.identity.connectedAccountID,
          });
        }
      }
      if (placements.instagramFeed) {
        for (const spec of placements.instagramFeed) {
          await EntPendingContent.createInternal({
            placement: "IG_FEED",
            placementSpec: spec,
            publishingStatus,
            pendingContentGroupId: null, // no group for immediate publish
            connectedAccountId: spec.identity.connectedAccountID,
          });
        }
      }
    }
    return c.json({ success: true });
  })
  // read content group api
  .get("/group/:id", async (c) => {
    const { id } = c.req.param();
    // read group and its contents
    const results = await db()
      .select()
      .from(pendingContentGroupTable)
      .leftJoin(
        unifiedContentTable,
        eq(
          pendingContentGroupTable.id,
          unifiedContentTable.pendingContentGroupId,
        ),
      )
      .where(
        and(
          eq(pendingContentGroupTable.id, id),
          eq(pendingContentGroupTable.workspaceId, Actor.workspaceID()),
        ),
      );

    if (!results || results.length === 0) {
      throw new AppError(404, { message: "Group not found" });
    }

    const group = results[0].pending_content_group;
    if (!group) throw new AppError(404, { message: "Group not found" });

    // Extract all contents from the results, filtering out null values
    const contents = results
      .map((row) => row.unified_content)
      .filter(
        (content): content is NonNullable<typeof content> => content !== null,
      );

    const groupSpec = group.pendingContentGroupSpec;

    const data: ContentCreateData = {
      base: {
        publishingStatus: group.publishingStatus,
        message: groupSpec?.baseMessage || "",
        attachments: groupSpec?.baseAttachments || [],
        schedulingSpec: groupSpec?.baseSchedulingSpec,
      },
      placements: {},
    };

    for (const content of contents) {
      const placementSpec = content.placementSpec;
      if (!placementSpec) continue;

      if (content.placement === "FB_FEED") {
        if (!data.placements.facebookFeed) data.placements.facebookFeed = [];
        data.placements.facebookFeed.push(placementSpec as FBFeedPlacementSpec);
      }
      if (content.placement === "IG_FEED") {
        if (!data.placements.instagramFeed) data.placements.instagramFeed = [];
        data.placements.instagramFeed.push(
          placementSpec as IGFeedPlacementSpec,
        );
      }
    }

    return c.json({ contentCreateData: data });
  })
  .delete("/group/:id", async (c) => {
    const { id } = c.req.param();
    const deleted = await EntPendingContentGroup.deleteByID(id);
    return c.json({ success: !!deleted });
  })
  .delete("/content/:id", async (c) => {
    const { id } = c.req.param();
    const content = await EntPendingContent.fromID(id);
    if (!content)
      throw new AppError(404, { message: `Content ${id} not found` });
    const deleted = await content._delete();
    return c.json({ success: !!deleted });
  });
