import type { WorkspaceNotificationEnvelope } from "@shared/workspace";
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import type React from "react";

export type NotificationDisplay = {
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

export function mapNotificationToDisplay(
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
