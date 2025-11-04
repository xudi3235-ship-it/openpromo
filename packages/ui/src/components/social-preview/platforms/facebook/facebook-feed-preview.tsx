import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { MoreHorizontal } from "lucide-react";
import {
  PreviewContainer,
  PreviewHeader,
  PreviewMedia,
} from "../../primitives";
import type {
  BasePreviewProps,
  PreviewData,
  PreviewMediaItem,
} from "../../types";
import { FacebookActions } from "./facebook-actions";
import { FacebookEngagementStats } from "./facebook-engagement-stats";

export interface FacebookFeedPreviewProps extends BasePreviewProps {
  data: PreviewData;
  /** Custom renderer for attachments */
  renderMedia?: (media: PreviewMediaItem, className: string) => React.ReactNode;
}

export function FacebookFeedPreview({
  data,
  size = "default",
  renderMedia,
  className,
}: FacebookFeedPreviewProps) {
  const {
    accountName,
    profilePicUrl,
    caption,
    media = [],
    metrics,
    timestamp,
    location,
  } = data;

  const timeLabel = timestamp
    ? typeof timestamp === "string"
      ? timestamp
      : timestamp.toLocaleDateString()
    : "2 hours ago";

  const locationLabel = location || "San Francisco, CA";

  return (
    <PreviewContainer size={size} platform="FACEBOOK" className={className}>
      <div className="bg-background border rounded-lg overflow-hidden">
        {/* Header */}
        <PreviewHeader
          accountName={accountName || "Facebook Page"}
          profilePicUrl={profilePicUrl}
          timestamp={timeLabel}
          location={locationLabel}
          size={size}
          variant="detailed"
          actions={
            <Button variant="ghost" size="sm" className="p-1 h-auto">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          }
        />

        {/* Caption (before media for FB) */}
        {caption && (
          <div
            className={cn(
              size === "compact" || size === "thumbnail"
                ? "px-2 pb-2"
                : "px-3 pb-3",
            )}
          >
            <div className="text-sm whitespace-pre-wrap break-words">
              {caption}
            </div>
          </div>
        )}

        {/* Media */}
        <PreviewMedia
          media={media}
          aspectRatio="3/4"
          renderMedia={renderMedia}
          placeholder={
            <div className="h-64 bg-muted flex items-center justify-center text-muted-foreground text-sm">
              Upload media to get started
            </div>
          }
        />

        {/* Engagement Stats */}
        <FacebookEngagementStats
          likes={metrics?.likes}
          comments={metrics?.comments}
          shares={metrics?.shares}
          size={size}
        />

        {/* Actions */}
        <FacebookActions size={size} />
      </div>
    </PreviewContainer>
  );
}
