import { Button } from "@openpromo/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openpromo/ui/components/popover";
import { Separator } from "@openpromo/ui/components/separator";
import { Bell, BellRing } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useWorkspaceWebSocket } from "@/hooks/useWorkspaceWebSocket";
import { NotificationHeader } from "./notification-header";
import { NotificationList } from "./notification-list";

type WorkspaceNotificationBellProps = {
  workspaceSlug: string;
  renderTrigger?: (args: {
    hasUnread: boolean;
    unreadCount: number;
    open: boolean;
  }) => React.ReactElement;
};

export function WorkspaceNotificationBell({
  workspaceSlug,
  renderTrigger,
}: WorkspaceNotificationBellProps) {
  const {
    notifications,
    clearNotifications,
    refreshNotifications,
    isLoading,
    isFetching,
  } = useWorkspaceWebSocket();
  const [open, setOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(() => Date.now());

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => {
      return notification.timestamp > lastSeenAt;
    }).length;
  }, [notifications, lastSeenAt]);

  const hasUnread = unreadCount > 0;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      void refreshNotifications();
      setLastSeenAt(Date.now());
    }
  };

  const handleClear = () => {
    setLastSeenAt(Date.now());
    // Optimistic - clears instantly in the UI
    void clearNotifications();
  };

  const triggerElement = renderTrigger ? (
    renderTrigger({ hasUnread, unreadCount, open })
  ) : (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label="Workspace notifications"
    >
      {hasUnread ? (
        <BellRing className="size-5" />
      ) : (
        <Bell className="size-5" />
      )}
      {hasUnread && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-medium text-destructive-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{triggerElement}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 translate-x-24"
        sideOffset={8}
      >
        <NotificationHeader
          isFetching={isFetching}
          hasNotifications={notifications.length > 0}
          onClear={handleClear}
        />
        <Separator />
        <NotificationList
          notifications={notifications}
          workspaceSlug={workspaceSlug}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </PopoverContent>
    </Popover>
  );
}

export const WORKSPACE_NOTIFICATION_PORTAL_ID =
  "workspace-notification-sidebar-slot";
