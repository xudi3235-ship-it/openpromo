import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { ExternalLink, MoreHorizontal } from "lucide-react";
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

        {/* Call to Action Button */}
        {callToActionLabel && (
          <div
            className={cn(
              "border-t",
              size === "compact" || size === "thumbnail"
                ? "px-2 py-2"
                : "px-3 py-2.5",
            )}
          >
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full font-semibold",
                size === "compact" || size === "thumbnail"
                  ? "h-8 text-xs"
                  : "h-9 text-sm",
              )}
              asChild={!!callToActionLink}
              disabled={!callToActionLink}
            >
              {callToActionLink ? (
                <a
                  href={callToActionLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  {/* Try to load favicon from the domain */}
                  {(() => {
                    try {
                      const url = new URL(callToActionLink);
                      return (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`}
                          alt=""
                          className={cn(
                            "mr-2 flex-shrink-0 rounded",
                            size === "compact" || size === "thumbnail"
                              ? "w-3.5 h-3.5"
                              : "w-4 h-4",
                          )}
                          onError={(e) => {
                            // Fallback to ExternalLink icon if favicon fails
                            e.currentTarget.style.display = "none";
                            const icon = e.currentTarget.nextElementSibling;
                            if (icon) {
                              (icon as HTMLElement).style.display = "block";
                            }
                          }}
                        />
                      );
                    } catch {
                      return null;
                    }
                  })()}
                  <ExternalLink
                    className={cn(
                      "mr-2 flex-shrink-0 hidden",
                      size === "compact" || size === "thumbnail"
                        ? "w-3.5 h-3.5"
                        : "w-4 h-4",
                    )}
                  />
                  <span className="truncate">{callToActionLabel}</span>
                </a>
              ) : (
                <>
                  <ExternalLink
                    className={cn(
                      "mr-2 flex-shrink-0",
                      size === "compact" || size === "thumbnail"
                        ? "w-3.5 h-3.5"
                        : "w-4 h-4",
                    )}
                  />
                  <span className="truncate">{callToActionLabel}</span>
                </>
              )}
            </Button>
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
