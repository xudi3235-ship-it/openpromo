import { Button } from "@openpromo/ui/components/button";

type NotificationHeaderProps = {
  isFetching: boolean;
  isClearing: boolean;
  hasNotifications: boolean;
  onClear: () => void;
};

export function NotificationHeader({
  isFetching,
  isClearing,
  hasNotifications,
  onClear,
}: NotificationHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Notifications</span>
        {isFetching && (
          <span className="text-xs text-muted-foreground">Updating…</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto px-2 py-1 text-xs"
        onClick={onClear}
        disabled={!hasNotifications || isClearing}
      >
        {isClearing ? "Clearing…" : "Clear"}
      </Button>
    </div>
  );
}
