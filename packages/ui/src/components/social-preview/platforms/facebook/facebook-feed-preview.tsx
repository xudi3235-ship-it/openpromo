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
    firstComment,
  } = data;

  const timeLabel = timestamp
    ? typeof timestamp === "string"
      ? timestamp
      : timestamp.toLocaleDateString()
    : "2 hours ago";

  const locationLabel = location || "San Francisco, CA";

  return (
    <PreviewContainer size={size} platform="FACEBOOK" className={className}>
      <div className="bg-background border rounded-lg aspect-[9/16] flex flex-col">
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
            "overflow-hidden flex-1",
            size === "compact" || size === "thumbnail" ? "px-2" : "px-3",
          )}
        >
          <PreviewMedia
            media={media}
            aspectRatio="1/1"
            layout="collage"
            renderMedia={renderMedia}
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

        {/* First Comment */}
        {firstComment && (
          <div
            className={cn(
              "border-t bg-muted/30",
              size === "compact" || size === "thumbnail"
                ? "px-2 py-2"
                : "px-3 py-3",
            )}
          >
            <div className="flex gap-2">
              {/* Commenter Avatar */}
              <div
                className={cn(
                  "rounded-full bg-primary flex items-center justify-center shrink-0",
                  size === "compact" || size === "thumbnail"
                    ? "w-6 h-6 text-[8px]"
                    : "w-8 h-8 text-xs",
                )}
              >
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt="You"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="font-semibold text-primary-foreground">
                    {accountName?.charAt(0) || "Y"}
                  </span>
                )}
              </div>

              {/* Comment Bubble */}
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "bg-muted rounded-2xl inline-block max-w-full",
                    size === "compact" || size === "thumbnail"
                      ? "px-2.5 py-1.5"
                      : "px-3 py-2",
                  )}
                >
                  <div
                    className={cn(
                      "font-semibold",
                      size === "compact" || size === "thumbnail"
                        ? "text-xs mb-0.5"
                        : "text-sm mb-1",
                    )}
                  >
                    {accountName || "You"}
                  </div>
                  <p
                    className={cn(
                      "text-foreground whitespace-pre-wrap break-words",
                      size === "compact" || size === "thumbnail"
                        ? "text-[11px]"
                        : "text-sm",
                    )}
                  >
                    {firstComment}
                  </p>
                </div>

                {/* Comment Actions */}
                <div
                  className={cn(
                    "flex items-center gap-3 mt-1 text-muted-foreground font-semibold",
                    size === "compact" || size === "thumbnail"
                      ? "text-[10px] ml-2"
                      : "text-xs ml-3",
                  )}
                >
                  <span>Like</span>
                  <span>Reply</span>
                  <span>2h</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PreviewContainer>
  );
}
