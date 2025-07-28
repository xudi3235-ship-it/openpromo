import { UnifiedContent } from "@openpromo/core/content/unified_content";
import { PendingContentGroup } from "@openpromo/core/content/pending_content_group";
import { scheduleEvent } from "@openpromo/core/event/scheduler";
import { Resource } from "sst";
import { bus } from "sst/aws/bus";
import { nullThrows } from "@openpromo/core/util/common";

export const handler = bus.subscriber(
  [
    UnifiedContent.Event.Created,
    UnifiedContent.Event.Scheduled,
    UnifiedContent.Event.Publish,
    PendingContentGroup.Event.Created,
  ],
  async (evt, raw) => {
    // Handle events from EventBridge Scheduler - they come with our event structure
    if (raw.source === "openpromo.scheduler") {
      console.log("Received scheduled event:", raw.detail);
      const scheduledEvent = raw.detail;
      throw new Error("Not implemented");
    }

    switch (evt.type) {
      case UnifiedContent.Event.Created.type:
        break;
      case UnifiedContent.Event.Scheduled.type:
        // Use our scheduler helper to schedule the publish event
        const workspaceID = nullThrows(
          // @ts-ignore
          evt.metadata.actor.properties?.workspaceID,
          "Workspace ID is required",
        );

        // Schedule the publish event using SST's event system
        const result = await scheduleEvent(
          UnifiedContent.Event.Publish,
          { id: evt.properties.id, workspaceID },
          evt.properties.scheduledPublishAt,
          {
            scheduleName: `publish-content-${evt.properties.id}`,
            schedulerRoleArn: process.env.SCHEDULER_ROLE_ARN!,
          },
        );

        console.log(
          `Scheduled content ${evt.properties.id} for ${evt.properties.scheduledPublishAt}`,
          { scheduleArn: result.scheduleArn },
        );
        break;

      case UnifiedContent.Event.Publish.type:
        await UnifiedContent.publish({ id: evt.properties.id });
        break;

      case PendingContentGroup.Event.Created.type:
        break;

      default:
        throw new Error(`Unknown event type: ${evt}`);
    }
  },
);
