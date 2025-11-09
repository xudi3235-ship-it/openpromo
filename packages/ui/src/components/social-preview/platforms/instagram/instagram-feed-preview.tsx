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
    firstComment,
  } = data;

  const timeLabel = timestamp
    ? typeof timestamp === "string"
      ? timestamp
      : timestamp.toLocaleDateString()
    : "Just now";

  const isCompact = size === "thumbnail" || size === "compact";
  const likesTextSize = isCompact ? "text-xs" : "text-sm";
  const metadataLocation = location || "New York, NY";
  const metadataTimestamp = timeLabel || "Just now";
  const headerAvatarSize = isCompact ? "xs" : "sm";

  return (
    <PreviewContainer size={size} platform="INSTAGRAM" className={className}>
      <div className="bg-background border rounded-lg">
        {/* Header */}
        <PreviewHeader
          accountName={accountName || "Instagram Account"}
          profilePicUrl={profilePicUrl}
          location={metadataLocation}
          timestamp={metadataTimestamp}
          size={size}
          variant="minimal"
          showMetaOnMinimal
          metaLayout="stacked"
          avatarSize={headerAvatarSize}
          showLocationPin={false}
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

        {/* First Comment */}
        {firstComment && (
          <div className={cn(isCompact ? "px-2 pb-1.5" : "px-3 pb-2")}>
            <div className="flex items-start gap-2">
              {/* Commenter Avatar */}
              <div
                className={cn(
                  "rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 p-[1.5px] shrink-0",
                  isCompact ? "w-5 h-5" : "w-6 h-6",
                )}
              >
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt="You"
                    className="w-full h-full rounded-full object-cover bg-background"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                    <span
                      className={cn(
                        "font-semibold uppercase",
                        isCompact ? "text-[7px]" : "text-[8px]",
                      )}
                    >
                      {accountName?.charAt(0) || "Y"}
                    </span>
                  </div>
                )}
              </div>

              {/* Comment Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(isCompact ? "text-xs" : "text-sm")}>
                  <span className="font-semibold mr-1.5">
                    {accountName || "you"}
                  </span>
                  <span className="text-foreground/90 whitespace-pre-wrap break-words">
                    {firstComment}
                  </span>
                </p>

                {/* Comment Actions */}
                <div
                  className={cn(
                    "flex items-center gap-3 mt-1 text-muted-foreground",
                    isCompact ? "text-[10px]" : "text-xs",
                  )}
                >
                  <span>2h</span>
                  <button
                    type="button"
                    className="font-semibold hover:text-foreground/70"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
