import { Button } from "@openpromo/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openpromo/ui/components/popover";
import { Separator } from "@openpromo/ui/components/separator";
import type { WorkspaceNotificationEnvelope } from "@shared/workspace";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Bell, BellRing, CheckCircle2 } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useWorkspaceWebSocket } from "@/hooks/useWorkspaceWebSocket";

type WorkspaceNotificationBellProps = {
  workspaceSlug: string;
};

const MAX_VISIBLE_NOTIFICATIONS = 10;

export function WorkspaceNotificationBell({
  workspaceSlug,
}: WorkspaceNotificationBellProps) {
  const { notifications, clearNotifications } = useWorkspaceWebSocket();
  const [open, setOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(() => Date.now());

  const unreadCount = useMemo(() => {
    return notifications.filter((notification) => {
      return notification.timestamp > lastSeenAt;
    }).length;
  }, [notifications, lastSeenAt]);

  const recentNotifications = useMemo(() => {
    return [...notifications].slice(-MAX_VISIBLE_NOTIFICATIONS).reverse();
  }, [notifications]);

  const hasUnread = unreadCount > 0;
  const BellIcon = hasUnread ? BellRing : Bell;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setLastSeenAt(Date.now());
    }
  };

  const handleClear = () => {
    clearNotifications();
    setLastSeenAt(Date.now());
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Workspace notifications"
        >
          <BellIcon className="size-5" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
            onClick={handleClear}
            disabled={notifications.length === 0}
          >
            Clear
          </Button>
        </div>
        <Separator />
        <div className="max-h-72 overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          ) : (
            <ul className="divide-y">
              {recentNotifications.map((envelope, index) => {
                const meta = mapNotificationToDisplay(envelope, workspaceSlug);
                const key = `${envelope.timestamp}-${index}`;

                return (
                  <li key={key} className="px-4 py-3 text-sm">
                    <div className="flex items-start gap-3">
                      <span className="mt-1 text-muted-foreground">
                        {meta.icon}
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium leading-none text-foreground">
                            {meta.title}
                          </p>
                          <time
                            dateTime={new Date(
                              envelope.timestamp,
                            ).toISOString()}
                            className="shrink-0 text-xs text-muted-foreground"
                          >
                            {formatTimestamp(envelope.timestamp)}
                          </time>
                        </div>
                        {meta.description && (
                          <p className="text-xs text-muted-foreground">
                            {meta.description}
                          </p>
                        )}
                        {meta.href &&
                          (meta.href.type === "route" ? (
                            <Link
                              to={meta.href.to}
                              params={meta.href.params}
                              className="inline-flex text-xs font-medium text-primary hover:underline"
                            >
                              {meta.href.label}
                            </Link>
                          ) : (
                            <a
                              href={meta.href.href}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex text-xs font-medium text-primary hover:underline"
                            >
                              {meta.href.label}
                            </a>
                          ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type NotificationDisplay = {
  title: string;
  description?: string;
  icon: React.ReactNode;
  href?:
    | {
        type: "route";
        to: string;
        params?: Record<string, string>;
        label: string;
      }
    | {
        type: "external";
        href: string;
        label: string;
      };
};

function mapNotificationToDisplay(
  envelope: WorkspaceNotificationEnvelope,
  workspaceSlug: string,
): NotificationDisplay {
  const { notification } = envelope;

  switch (notification.type) {
    case "content.published":
      return {
        title: "Content published",
        description: `Post ${notification.contentId} is live on ${notification.placement}.`,
        icon: <CheckCircle2 className="size-4 text-emerald-500" />,
        href: notification.shareUrl
          ? {
              type: "external",
              href: notification.shareUrl,
              label: "Open post",
            }
          : {
              type: "route",
              to: "/workspaces/$workspaceSlug/content",
              params: { workspaceSlug },
              label: "View in content",
            },
      };
    case "content.failed":
      return {
        title: "Content failed to publish",
        description:
          notification.errorMessage ??
          `Post ${notification.contentId} needs attention.`,
        icon: <AlertTriangle className="size-4 text-destructive" />,
        href: {
          type: "route",
          to: "/workspaces/$workspaceSlug/content",
          params: { workspaceSlug },
          label: "Review content",
        },
      };
    default:
      return {
        // @ts-expect-error - exhaustive check
        title: notification.type,
        description: undefined,
        icon: <Bell className="size-4" />,
      };
  }
}

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
export const WORKSPACE_NOTIFICATION_PORTAL_ID =
  "workspace-notification-sidebar-slot";
