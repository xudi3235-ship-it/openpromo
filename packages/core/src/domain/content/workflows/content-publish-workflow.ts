import {
  EntPendingContent,
  EntPendingContentGroup,
} from "@core/domain/content/entity";
import { notifyContentFailed } from "@core/domain/workspace/notifications";
import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { AllPlacement } from "@core/schemas/content.sql";
import { Log } from "@core/utils/log";
import z from "zod";
import { FacebookPublisher } from "./facebook-publisher";
import { InstagramPublisher } from "./instagram-publisher";
import { TikTokPublisher } from "./tiktok-publisher";

const PublishWorkflowParams = z.object({
  actor: Actor.WorkspaceUserSchema,
  pendingContentID: z.string(),
});

export type PublishWorkflowParams = z.infer<typeof PublishWorkflowParams>;
const log = Log.create({ namespace: "workflow" });

export class PendingContentPublishWorkflow extends CoreWorkflowEntrypoint<PublishWorkflowParams> {
  async runWithContext(
    ctx: CoreWorkflowContext,
    event: CoreWorkflowEvent<PublishWorkflowParams>,
    step: CoreWorkflowStep,
  ) {
    console.log("// Starting workflow");
    const { pendingContentID } = event.payload;

    const { scheduledTime, placement, isDraft, isPublished } = await step.do(
      "fetch content info",
      async () => {
        const c = await EntPendingContent.fromID(pendingContentID);
        return {
          id: c.data.id,
          scheduledTime: c.data.placementSpec?.schedulingSpec?.publishAt,
          isDraft: c.isDraft(),
          placement: c.placement(),
          isPublished: c.isPublished(),
        };
      },
    );
    if (isPublished) {
      log.info("content already published, skip workflow");
      return;
    }

    if (scheduledTime && !isDraft) {
      const target = new Date(scheduledTime);
      log.info(
        `wait until scheduled time (${target.toISOString()}) or early publish event`,
      );
      await step.sleepUntil("wait until scheduled time", target);
    } else if (isDraft) {
      log.info("is draft");
      await step.waitForEvent("wait for draft publish event", {
        type: "publish_draft",
      });
    }
    try {
      switch (placement) {
        case AllPlacement.FB_FEED: {
          const fbPublisher = new FacebookPublisher();
          await fbPublisher.publish(ctx, step, pendingContentID);
          break;
        }
        case AllPlacement.IG_FEED: {
          const igPublisher = new InstagramPublisher();
          await igPublisher.publish(ctx, step, pendingContentID);
          break;
        }
        case AllPlacement.TT_FEED: {
          const tikTokPublisher = new TikTokPublisher();
          await tikTokPublisher.publish(ctx, step, pendingContentID);
          break;
        }
        default:
          throw new Error(`unsupported placement ${placement}`);
      }
    } catch (err) {
      console.error("publish failed", err);

      const errorMessage = err instanceof Error ? err.message : String(err);

      await step.do("mark content as failed", async () => {
        const c = await EntPendingContent.fromID(pendingContentID);
        await c.setPublishingStatus("FAILED_TO_PUBLISH");
      });

      // Check if all contents in the group have failed and send notification
      await step.do("check group failure and send notification", async () => {
        const c = await EntPendingContent.fromID(pendingContentID);
        const groupID = c.data.pendingContentGroupId;

        let isGroupFullyFailed = false;

        if (groupID) {
          const result =
            await EntPendingContentGroup.checkAndMarkGroupFailureByID(groupID);

          if (!result) {
            log.error(
              new Error(`failed to check group failure for group ${groupID}`),
            );
          } else {
            isGroupFullyFailed = result.groupUpdated;

            if (result.groupUpdated) {
              log.info(
                `all ${result.totalCount} contents in group ${groupID} have failed, marked group as failed`,
              );
            } else if (result.allFailed) {
              log.warn(
                `all contents failed but group was not updated for group ${groupID}`,
              );
            } else {
              log.info(
                `group ${groupID} has ${result.totalCount - result.failedCount} of ${result.totalCount} contents still pending`,
              );
            }
          }
        } else {
          log.info("content not part of a group, skip group status check");
        }

        // Send failure notification
        try {
          await notifyContentFailed({
            workspaceId: c.data.workspaceId,
            contentId: c.data.id,
            placement: c.placement(),
            errorMessage,
            failedAt: new Date(),
            groupId: groupID,
            isGroupFullyFailed,
          });
          log.info(
            `sent content failure notification for content ${c.data.id}`,
          );
        } catch (notifyError) {
          log.warn("failed to send content failure notification", {
            contentId: c.data.id,
            error: notifyError,
          });
        }
      });
    }
    step.do("publish to placements", async () => {
      const actor = Actor.assert("workspace_user");
      console.log(`finally ${actor}`);
    });
  }
}
