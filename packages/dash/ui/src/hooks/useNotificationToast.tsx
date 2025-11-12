import type { WorkspaceNotification } from "@shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  buildFailedNotificationMessage,
  buildPublishedNotificationMessage,
} from "@/lib/notification-formatters";
import { invalidateContentListQueries } from "@/queries/content-orpc";

export function useNotificationToast() {
  const queryClient = useQueryClient();

  return useCallback(
    (notification: WorkspaceNotification) => {
      // Invalidate content queries for all content notifications
      void invalidateContentListQueries(queryClient);

      if (notification.type === "content.published") {
        const { title, description } =
          buildPublishedNotificationMessage(notification);

        toast.success(title, {
          description,
          action: notification.shareUrl
            ? {
                label: "View",
                onClick: () => {
                  if (typeof window !== "undefined") {
                    window.open(
                      notification.shareUrl,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                },
              }
            : undefined,
        });
      } else if (notification.type === "content.failed") {
        const { title, description } =
          buildFailedNotificationMessage(notification);

        toast.error(title, {
          description,
          duration: 8000, // Longer duration for error messages
          action: {
            label: "Dismiss",
            onClick: () => {
              // User can manually dismiss the notification
            },
          },
        });
      }
    },
    [queryClient],
  );
}
