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
      <div className="bg-background border rounded-lg aspect-[9/16] flex flex-col">
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
          showStoryRing
          actions={
            <Button variant="ghost" size="sm" className="p-1 h-auto">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          }
        />

        {/* Media */}
        <div className="overflow-hidden flex-1">
          <PreviewMedia
            media={media}
            aspectRatio="1/1"
            layout="carousel"
            objectFit="cover"
            renderMedia={renderMedia}
            className="h-full"
            placeholder={
              <div className="w-full h-full bg-muted/50 rounded-lg flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <svg
                  className="w-10 h-10 opacity-40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs">Upload media</span>
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

        {/* View all comments link */}
        {metrics?.comments !== undefined && metrics.comments > 0 && (
          <div
            className={cn(
              "text-muted-foreground",
              isCompact ? "text-xs px-2 pb-1" : "text-sm px-3 pb-1.5",
            )}
          >
            View all {metrics.comments.toLocaleString()} comments
          </div>
        )}

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
