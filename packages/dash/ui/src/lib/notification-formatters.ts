import type { WorkspaceNotification } from "@shared";

// ============ Placement Formatting ============

const placementLabels: Record<string, string> = {
  FB_FEED: "Facebook Post",
  FB_STORY: "Facebook Story",
  FB_REEL: "Facebook Reel",
  IG_FEED: "Instagram Post",
  IG_STORY: "Instagram Story",
  IG_REEL: "Instagram Reel",
  TT_FEED: "TikTok Video",
};

export function formatPlacement(placement: string): string {
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
}

// ============ Timestamp Formatting ============

export function formatTimestamp(
  timestamp: string | undefined,
  options?: {
    dateStyle?: "short" | "medium" | "long" | "full";
    timeStyle?: "short" | "medium" | "long" | "full";
  },
): string | undefined {
  if (!timestamp) return undefined;

  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: options?.dateStyle ?? "medium",
      timeStyle: options?.timeStyle ?? "short",
    }).format(date);
  } catch {
    return undefined;
  }
}

// ============ Notification Message Builders ============

export function buildPublishedNotificationMessage(
  notification: Extract<WorkspaceNotification, { type: "content.published" }>,
): {
  title: string;
  description: string;
} {
  const placementLabel = formatPlacement(notification.placement);
  const title = `${placementLabel} Published`;

  const formattedTime = formatTimestamp(notification.publishedAt);
  const description = formattedTime
    ? `Published on ${formattedTime}.`
    : `Published successfully on ${placementLabel}.`;

  return { title, description };
}

export function buildFailedNotificationMessage(
  notification: Extract<WorkspaceNotification, { type: "content.failed" }>,
): {
  title: string;
  description: string;
} {
  const placementLabel = formatPlacement(notification.placement);

  const title = notification.isGroupFullyFailed
    ? "Post Group Failed"
    : `${placementLabel} Failed`;

  const formattedTime = formatTimestamp(notification.failedAt);

  let description: string;
  if (notification.isGroupFullyFailed) {
    description = `All contents in the group failed to publish.${notification.errorMessage ? ` ${notification.errorMessage}` : ""}`;
  } else if (notification.errorMessage) {
    description = `${notification.errorMessage}${formattedTime ? ` at ${formattedTime}` : ""}`;
  } else {
    description = `Failed to publish ${placementLabel}${formattedTime ? ` at ${formattedTime}` : ""}.`;
  }

  return { title, description: description.trim() };
}
