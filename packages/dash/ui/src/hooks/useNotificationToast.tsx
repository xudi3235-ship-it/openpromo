import type { WorkspaceNotification } from "@shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { invalidateContentListQueries } from "@/queries/content";

const placementLabels: Record<string, string> = {
  FB_FEED: "Facebook Post",
  FB_STORY: "Facebook Story",
  FB_REEL: "Facebook Reel",
  IG_FEED: "Instagram Post",
  IG_STORY: "Instagram Story",
  IG_REEL: "Instagram Reel",
  TT_FEED: "TikTok Video",
};

const formatPlacement = (placement: string) => {
  const label = placementLabels[placement];
  if (label) return label;

  return placement
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(
      (segment) =>
        segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join(" ");
};

export function useNotificationToast() {
  const queryClient = useQueryClient();
  return useCallback(
    (notification: WorkspaceNotification) => {
      if (notification.type === "content.published") {
        void invalidateContentListQueries(queryClient);
        const placementLabel = formatPlacement(notification.placement);
        const title = `${placementLabel} Published`;

        const publishedAt = notification.publishedAt
          ? new Date(notification.publishedAt)
          : undefined;
        const formattedTime = publishedAt
          ? new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(publishedAt)
          : undefined;

        toast.success(title, {
          description: formattedTime
            ? `Published on ${formattedTime}.`
            : `Published successfully on ${placementLabel}.`,
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
      }
    },
    [queryClient],
  );
}
