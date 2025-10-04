import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarRescheduleDialog } from "@/components/calendar/reschedule-dialog";
import { useCalendarRescheduleStore } from "@/stores/calendar-reschedule-store";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";

export function ContentRescheduleDialog() {
  const rescheduleState = useCalendarRescheduleStore((state) => state.state);
  const closeRescheduleDialog = useCalendarRescheduleStore(
    (state) => state.close,
  );
  const openDialog = useDialogComposerStore((state) => state.openDialog);

  const handleRescheduleConfirm = (publishAt: Date) => {
    closeRescheduleDialog();
    toast("Reschedule pending", {
      description: format(publishAt, "MMM d, yyyy • h:mma"),
      position: "bottom-left",
    });
  };

  const handleRescheduleEditMore = () => {
    if (rescheduleState?.groupId) {
      openDialog(rescheduleState.groupId);
    }
    closeRescheduleDialog();
  };

  return (
    <CalendarRescheduleDialog
      state={rescheduleState}
      onClose={closeRescheduleDialog}
      onConfirm={handleRescheduleConfirm}
      onEditMore={handleRescheduleEditMore}
    />
  );
}
