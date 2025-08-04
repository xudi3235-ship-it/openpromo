import { UnifiedContent } from "../content/unified_content";
import { deleteScheduledEvent, scheduleEvent } from "./scheduler";

// Example usage:

// 1. Schedule a publish event for 7 days from now
async function _scheduleContentPublish(contentId: string, workspaceID: string) {
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await scheduleEvent(
    UnifiedContent.Event.Publish,
    {
      id: contentId,
      workspaceID,
    },
    sevenDaysFromNow,
    {
      scheduleName: `publish-content-${contentId}`,
    },
  );

  console.log(
    `Scheduled content ${contentId} for ${sevenDaysFromNow.toISOString()}`,
  );
  return result;
}

// 2. Schedule any event with custom metadata
// biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
async function _scheduleContentCreation(contentData: any, publishAt: Date) {
  const result = await scheduleEvent(
    UnifiedContent.Event.Created,
    { id: contentData.id },
    publishAt,
    {
      scheduleName: `create-content-${contentData.id}`,
    },
  );

  return result;
}

// 3. Cancel a scheduled event
async function _cancelContentPublish(scheduleName: string) {
  await deleteScheduledEvent(scheduleName);
  console.log(`Cancelled scheduled event: ${scheduleName}`);
}
