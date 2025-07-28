import { scheduleEvent, deleteScheduledEvent } from "./scheduler";
import { UnifiedContent } from "../content/unified_content";

// Example usage:

// 1. Schedule a publish event for 7 days from now
async function scheduleContentPublish(contentId: string, workspaceID: string) {
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
async function scheduleContentCreation(contentData: any, publishAt: Date) {
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
async function cancelContentPublish(scheduleName: string) {
  await deleteScheduledEvent(scheduleName);
  console.log(`Cancelled scheduled event: ${scheduleName}`);
}
