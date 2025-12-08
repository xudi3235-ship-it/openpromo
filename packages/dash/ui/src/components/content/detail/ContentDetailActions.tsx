import type { UnifiedContentSelect } from "@core/schemas/content.sql";
import { Button } from "@openpromo/ui/components/button";
import { Stack } from "@openpromo/ui/components/stack";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { useCalendarRescheduleStore } from "@/stores/calendar-reschedule-store";

type ContentDetailActionsProps = {
  content: UnifiedContentSelect;
};

export function ContentDetailActions({ content }: ContentDetailActionsProps) {
  const openReschedule = useCalendarRescheduleStore((state) => state.open);

  const handleReschedule = () => {
    const event: MergedContentEntity = {
      type: "content",
      entity: content,
    };

    openReschedule({
      event,
      proposedPublishAt:
        content.placementSpec.schedulingSpec?.publishAt ?? new Date(),
      groupId: content.pendingContentGroupId ?? undefined,
    });
  };

  return (
    <Stack direction="row" gap="sm" className="flex-wrap">
      {content.permalinkUrl ? (
        <Button asChild variant="outline" size="sm">
          <a href={content.permalinkUrl} rel="noreferrer" target="_blank">
            View live post
          </a>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          View live post
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={handleReschedule}>
        Reschedule
      </Button>
    </Stack>
  );
}
