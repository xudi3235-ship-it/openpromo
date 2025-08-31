import { EntPendingContentGroup } from "@openpromo/core/content/entity/index";
import { NotImplementedError } from "@openpromo/core/error";
import { Log } from "@openpromo/core/util/log";
import { bus } from "sst/aws/bus";

const log = Log.create({ namespace: "event/bus_subscriber" });
export const handler = bus.subscriber(
  [
    EntPendingContentGroup.Events().Scheduled,
    EntPendingContentGroup.Events().Publish,
  ],
  async (evt, raw) => {
    // Handle events from EventBridge Scheduler - they come with our event structure
    if (raw.source === "openpromo.scheduler") {
      console.log("Received scheduled event:", raw.detail);
      const _scheduledEvent = raw.detail;
      throw new NotImplementedError("implement scheduled event handling");
    }

    switch (evt.type) {
      case EntPendingContentGroup.Events().Scheduled.type:
        log.info("Received scheduled event:", evt);
        break;
      case EntPendingContentGroup.Events().Publish.type:
        log.info("Received publish event:", evt);
        break;
      default: {
        const err = new Error(
          `Unknown event type: ${console.dir(evt, { depth: null })}`,
        );
        log.error(err);
        throw err;
      }
    }
  },
);
