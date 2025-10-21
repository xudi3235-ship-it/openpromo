import { format, getMinutes } from "date-fns";

// Format time with optional minutes
const formatTimeWithOptionalMinutes = (date: Date) => {
  return format(date, getMinutes(date) === 0 ? "ha" : "h:mma").toLowerCase();
};

interface CalendarEventCardHeaderProps {
  showTime?: boolean;
  startTime: Date;
  renderActionsMenu: () => React.ReactNode;
}

export function CalendarEventCardHeader({
  showTime,
  startTime,
  renderActionsMenu,
}: CalendarEventCardHeaderProps) {
  return (
    <div className="relative flex items-center justify-between px-2 pt-1.5 pb-1 z-10">
      {/* Time badge */}
      {showTime && (
        <div className="bg-gray-100/80 dark:bg-gray-700/80 text-gray-900 dark:text-white px-1.5 py-0.5 rounded text-[10px] font-medium pointer-events-none">
          {formatTimeWithOptionalMinutes(startTime)}
        </div>
      )}
      <div className="flex-1" />
      {/* Actions menu */}
      <div>{renderActionsMenu()}</div>
    </div>
  );
}
