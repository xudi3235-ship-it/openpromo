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
  /** Call-to-action button label */
  callToActionLabel?: string | null;
  /** Call-to-action button link URL */
  callToActionLink?: string | null;
}

export function FacebookFeedPreview({
  data,
  size = "default",
  renderMedia,
  callToActionLabel,
  callToActionLink,
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
      <div className="bg-background border rounded-lg">
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
        <div
          className={cn(
            "overflow-hidden",
            size === "compact" || size === "thumbnail" ? "px-2" : "px-3",
          )}
        >
          <PreviewMedia
            media={media}
            aspectRatio="3/4"
            layout="collage"
            renderMedia={renderMedia}
            placeholder={
              <div className="h-64 bg-muted flex items-center justify-center text-muted-foreground text-sm">
                Upload media to get started
              </div>
            }
          />
        </div>

        {/* Call to Action Link Preview Card */}
        {callToActionLabel && callToActionLink && (
          <div
            className={cn(
              "border-t",
              size === "compact" || size === "thumbnail" ? "p-2" : "p-3",
            )}
          >
            <a
              href={callToActionLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block border rounded-lg overflow-hidden hover:bg-muted/50 transition-colors"
            >
              {/* Link Details - Compact */}
              <div
                className={cn(
                  "bg-muted/30 flex items-center justify-between gap-3",
                  size === "compact" || size === "thumbnail" ? "p-2" : "p-2.5",
                )}
              >
                {/* Left: Domain with favicon */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {(() => {
                    try {
                      const url = new URL(callToActionLink);
                      return (
                        <>
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`}
                            alt=""
                            className={cn(
                              "rounded flex-shrink-0",
                              size === "compact" || size === "thumbnail"
                                ? "w-4 h-4"
                                : "w-5 h-5",
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div
                              className={cn(
                                "text-muted-foreground uppercase truncate",
                                size === "compact" || size === "thumbnail"
                                  ? "text-[9px]"
                                  : "text-[10px]",
                              )}
                            >
                              {url.hostname.replace(/^www\./, "")}
                            </div>
                            <div
                              className={cn(
                                "font-semibold truncate",
                                size === "compact" || size === "thumbnail"
                                  ? "text-xs"
                                  : "text-sm",
                              )}
                            >
                              {url.hostname.replace(/^www\./, "").split(".")[0]}
                            </div>
                          </div>
                        </>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                </div>

                {/* Right: CTA Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "font-semibold pointer-events-none flex-shrink-0",
                    size === "compact" || size === "thumbnail"
                      ? "h-7 text-[10px] px-3"
                      : "h-8 text-xs px-4",
                  )}
                >
                  {callToActionLabel}
                </Button>
              </div>
            </a>
          </div>
        )}

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
