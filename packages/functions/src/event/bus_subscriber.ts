// import { PendingContentGroup } from "@openpromo/core/content/pending_content_group";
// import { UnifiedContent } from "@openpromo/core/content/unified_content";
// import { NotImplementedError } from "@openpromo/core/error";
// import { Log } from "@openpromo/core/util/log";
// import { bus } from "sst/aws/bus";

// const log = Log.create({ namespace: "event/bus_subscriber" });
// export const handler = bus.subscriber(
//   [
//     UnifiedContent.Event.Created,
//     UnifiedContent.Event.Publish,
//     PendingContentGroup.Event.Created,
//   ],
//   async (evt, raw) => {
//     // Handle events from EventBridge Scheduler - they come with our event structure
//     if (raw.source === "openpromo.scheduler") {
//       console.log("Received scheduled event:", raw.detail);
//       const _scheduledEvent = raw.detail;
//       throw new NotImplementedError("implement scheduled event handling");
//     }

//     switch (evt.type) {
//       case UnifiedContent.Event.Created.type:
//         break;
//       case UnifiedContent.Event.Publish.type:
//         await UnifiedContent.publish({ id: evt.properties.id });
//         break;

//       case PendingContentGroup.Event.Created.type:
//         break;

//       default: {
//         const err = new Error(
//           `Unknown event type: ${console.dir(evt, { depth: null })}`,
//         );
//         log.error(err);
//         throw err;
//       }
//     }
//   },
// );
