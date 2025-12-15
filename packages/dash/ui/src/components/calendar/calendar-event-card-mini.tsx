import { cn } from "@openpromo/ui/lib/utils";
import type { PlacementSpec } from "@shared/content";
import { format } from "date-fns";
import { Check } from "lucide-react";
import type { CalendarEvent } from "@/components/calendar";
import { getEventData } from "@/components/calendar";
import { getPlatformIcon } from "@/components/content/utils/platform-icons";
import { matchEntity, matchPlacementSpec } from "@/lib/hono-client";

// Status border colors
const STATUS_BORDER_COLORS = {
  PUBLISHED: "border-l-green-500",
  SCHEDULED: "border-l-yellow-500",
  DRAFT: "border-l-gray-400",
  FAILED_TO_PUBLISH: "border-l-red-500",
  PUBLISH_NOW: "border-l-blue-500",
} as const;

interface CalendarEventCardMiniProps {
  event: CalendarEvent;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

/**
 * Ultra-compact event card for month view - minimal layout (h-6, ~24px)
 * Shows: time | platform icon | truncated text | ✓ if published
 * Left border indicates status (green=published, yellow=scheduled, gray=draft)
 */
export function CalendarEventCardMini({
  event,
  onClick,
  className,
}: CalendarEventCardMiniProps) {
  const eventData = getEventData(event);

  const publishingStatus = matchEntity(event, {
    content: (entity) => entity.entity.publishingStatus,
    group: (entity) => entity.entity.publishingStatus,
  });

  const isPublished = publishingStatus === "PUBLISHED";
  const borderColor =
    STATUS_BORDER_COLORS[publishingStatus] ?? STATUS_BORDER_COLORS.DRAFT;

  return matchEntity(event, {
    content: (entity) => {
      const { entity: content } = entity;
      const platformIcon = getPlatformIcon(content.placement);

      // Extract caption/message from placement spec
      const message = matchPlacementSpec(
        content.placementSpec as PlacementSpec,
        {
          FBFeed: (s) => s.postSpec.message,
          IGFeed: (s) => s.caption,
          TTFeed: (s) => s.caption,
        },
      );

      const displayText = message || eventData.title;
      const timeStr = format(eventData.start, "ha").toLowerCase();

      return (
        <button
          type="button"
          className={cn(
            "w-full h-6 bg-background border border-border border-l-2 rounded-sm px-1.5",
            "cursor-pointer hover:bg-accent/50 transition-colors overflow-hidden text-left",
            "flex items-center gap-1.5 group",
            borderColor,
            className,
          )}
          onClick={onClick}
        >
          {/* Time */}
          <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0 w-6">
            {timeStr}
          </span>

          {/* Platform icon */}
          {platformIcon && (
            <div className="w-3 h-3 flex-shrink-0 opacity-70">
              {platformIcon}
            </div>
          )}

          {/* Title - truncated */}
          <span className="flex-1 min-w-0 text-[11px] text-foreground truncate">
            {displayText}
          </span>

          {/* Published checkmark */}
          {isPublished && (
            <Check className="w-3 h-3 flex-shrink-0 text-green-600" />
          )}
        </button>
      );
    },
    group: (entity) => {
      const { contents } = entity;
      const platforms = [
        ...new Set(contents.map((content) => content.placement)),
      ];
      const timeStr = format(eventData.start, "ha").toLowerCase();

      return (
        <button
          type="button"
          className={cn(
            "w-full h-6 bg-background border border-border border-l-2 rounded-sm px-1.5",
            "cursor-pointer hover:bg-accent/50 transition-colors overflow-hidden text-left",
            "flex items-center gap-1.5 group",
            borderColor,
            className,
          )}
          onClick={onClick}
        >
          {/* Time */}
          <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0 w-6">
            {timeStr}
          </span>

          {/* Platform icons - stacked */}
          <div className="flex gap-0.5 flex-shrink-0">
            {platforms.slice(0, 2).map((platform) => {
              const platformIcon = getPlatformIcon(platform);
              return platformIcon ? (
                <div key={platform} className="w-3 h-3 opacity-70">
                  {platformIcon}
                </div>
              ) : null;
            })}
            {platforms.length > 2 && (
              <span className="text-[9px] text-muted-foreground">
                +{platforms.length - 2}
              </span>
            )}
          </div>

          {/* Title */}
          <span className="flex-1 min-w-0 text-[11px] text-foreground truncate">
            {contents.length} posts
          </span>

          {/* Published checkmark */}
          {isPublished && (
            <Check className="w-3 h-3 flex-shrink-0 text-green-600" />
          )}
        </button>
      );
    },
  });
}
