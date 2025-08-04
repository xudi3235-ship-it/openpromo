import { PendingContentGroup } from "@openpromo/core/content/pending_content_group";
import { UnifiedContent } from "@openpromo/core/content/unified_content";
import { bus } from "sst/aws/bus";

export const handler = bus.subscriber(
  [
    UnifiedContent.Event.Created,
    UnifiedContent.Event.Publish,
    PendingContentGroup.Event.Created,
  ],
  async (evt, raw) => {
    // Handle events from EventBridge Scheduler - they come with our event structure
    if (raw.source === "openpromo.scheduler") {
      console.log("Received scheduled event:", raw.detail);
      const _scheduledEvent = raw.detail;
      throw new Error("Not implemented");
    }

    switch (evt.type) {
      case UnifiedContent.Event.Created.type:
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
