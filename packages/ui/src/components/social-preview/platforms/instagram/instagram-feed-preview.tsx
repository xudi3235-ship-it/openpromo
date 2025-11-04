import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { MoreHorizontal } from "lucide-react";
import {
  PreviewCaption,
  PreviewContainer,
  PreviewHeader,
  PreviewMedia,
} from "../../primitives";
import type {
  BasePreviewProps,
  PreviewData,
  PreviewMediaItem,
} from "../../types";
import { InstagramActions } from "./instagram-actions";

export interface InstagramFeedPreviewProps extends BasePreviewProps {
  data: PreviewData;
  /** Custom renderer for attachments */
  renderMedia?: (media: PreviewMediaItem, className: string) => React.ReactNode;
}

export function InstagramFeedPreview({
  data,
  size = "default",
  renderMedia,
  className,
}: InstagramFeedPreviewProps) {
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
    : "Just now";

  const isCompact = size === "thumbnail" || size === "compact";
  const likesTextSize = isCompact ? "text-xs" : "text-sm";

  return (
    <PreviewContainer size={size} platform="INSTAGRAM" className={className}>
      <div className="bg-background border rounded-lg">
        {/* Header */}
        <PreviewHeader
          accountName={accountName || "Instagram Account"}
          profilePicUrl={profilePicUrl}
          location={location}
          size={size}
          variant="minimal"
          actions={
            <Button variant="ghost" size="sm" className="p-1 h-auto">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          }
        />

        {/* Media */}
        <div className="overflow-hidden">
          <PreviewMedia
            media={media}
            aspectRatio="1/1"
            layout="carousel"
            objectFit="cover"
            renderMedia={renderMedia}
            placeholder={
              <div className="h-64 bg-muted flex items-center justify-center text-muted-foreground text-sm">
                Upload media to get started
              </div>
            }
          />
        </div>

        {/* Actions */}
        <InstagramActions size={size} />

        {/* Likes */}
        {metrics?.likes !== undefined && (
          <div
            className={cn(
              "font-semibold",
              likesTextSize,
              isCompact ? "px-2 pb-1.5" : "px-3 pb-2",
            )}
          >
            {metrics.likes.toLocaleString()} likes
          </div>
        )}

        {/* Caption */}
        <PreviewCaption
          accountName={accountName}
          caption={caption}
          size={size}
          maxLines={2}
        />

        {/* Timestamp */}
        <div
          className={cn(
            "text-muted-foreground uppercase",
            isCompact ? "text-[10px] px-2 pb-2" : "text-xs px-3 pb-3",
          )}
        >
          {timeLabel}
        </div>
      </div>
    </PreviewContainer>
  );
}
