import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { ExternalLink } from "lucide-react";
import { PreviewContainer, PreviewMedia } from "../../primitives";
import type {
  BasePreviewProps,
  PreviewData,
  PreviewMediaItem,
} from "../../types";
import { FacebookReelActions } from "./facebook-reel-actions";

export interface FacebookReelPreviewProps extends BasePreviewProps {
  data: PreviewData;
  /** Custom renderer for video/media */
  renderMedia?: (media: PreviewMediaItem, className: string) => React.ReactNode;
  /** Custom share icon component */
  ShareIcon?: React.ComponentType<{ className?: string }>;
  /** Call-to-action button label */
  callToActionLabel?: string | null;
  /** Call-to-action button link URL */
  callToActionLink?: string | null;
}

export function FacebookReelPreview({
  data,
  size = "default",
  renderMedia,
  ShareIcon,
  callToActionLabel,
  callToActionLink,
  className,
}: FacebookReelPreviewProps) {
  const { accountName, profilePicUrl, caption, media = [], metrics } = data;

  const username = accountName || "Facebook Page";
  const isCompact = size === "thumbnail" || size === "compact";

  const avatarSize = isCompact ? "w-6 h-6" : "w-8 h-8";
  const textSize = isCompact ? "text-xs" : "text-sm";
  const captionSize = isCompact ? "text-[10px]" : "text-sm";
  const audioSize = isCompact ? "text-[9px]" : "text-xs";
  const bottomPadding = isCompact ? "p-2" : "p-3";

  return (
    <PreviewContainer size={size} platform="FACEBOOK" className={className}>
      <div className="bg-black rounded-lg overflow-hidden relative">
        <div className="aspect-[9/16] relative group">
          {/* Video Content */}
          <PreviewMedia
            media={media}
            aspectRatio="9/16"
            layout="single"
            objectFit="cover"
            renderMedia={renderMedia}
            placeholder={
              <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white/70">
                <div className="text-center">
                  <div
                    className={cn(
                      "mx-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur flex items-center justify-center mb-3",
                      isCompact ? "w-12 h-12" : "w-16 h-16",
                    )}
                  >
                    <svg
                      className={cn(isCompact ? "w-5 h-5" : "w-7 h-7")}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className={cn("leading-relaxed", captionSize)}>
                    Upload a video to create your reel
                  </p>
                </div>
              </div>
            }
          />

          {/* Actions Sidebar */}
          <FacebookReelActions
            size={size}
            likes={metrics?.likes}
            comments={metrics?.comments}
            shares={metrics?.shares}
            ShareIcon={ShareIcon}
          />

          {/* Bottom Caption Area with Gradient */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent",
              bottomPadding,
            )}
          >
            <div className="text-white space-y-2">
              {/* Avatar + Username Row */}
              <div className="flex items-center space-x-2">
                <div
                  className={cn(
                    "rounded-full flex items-center justify-center bg-blue-600",
                    avatarSize,
                  )}
                >
                  {profilePicUrl ? (
                    <img
                      src={profilePicUrl}
                      alt={username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center">
                      <span
                        className={cn(
                          "font-semibold uppercase text-white",
                          isCompact ? "text-[8px]" : "text-xs",
                        )}
                      >
                        {username.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <span className={cn("font-semibold", textSize)}>
                  {username}
                </span>
                <span
                  className={cn(
                    "bg-blue-600 text-white px-2 py-0.5 rounded font-medium",
                    isCompact ? "text-[9px]" : "text-xs",
                  )}
                >
                  Follow
                </span>
              </div>

              {/* Caption */}
              {caption && (
                <div className={cn("line-clamp-2", captionSize)}>{caption}</div>
              )}

              {/* Call to Action Button */}
              {callToActionLabel && (
                <Button
                  variant="secondary"
                  size="sm"
                  className={cn(
                    "w-full bg-white/90 hover:bg-white text-black font-semibold",
                    isCompact ? "h-7 text-[10px]" : "h-8 text-xs",
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
                                "mr-1.5 flex-shrink-0 rounded",
                                isCompact ? "w-3 h-3" : "w-3.5 h-3.5",
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
                          "mr-1.5 flex-shrink-0 hidden",
                          isCompact ? "w-3 h-3" : "w-3.5 h-3.5",
                        )}
                      />
                      <span className="truncate">{callToActionLabel}</span>
                    </a>
                  ) : (
                    <>
                      <ExternalLink
                        className={cn(
                          "mr-1.5 flex-shrink-0",
                          isCompact ? "w-3 h-3" : "w-3.5 h-3.5",
                        )}
                      />
                      <span className="truncate">{callToActionLabel}</span>
                    </>
                  )}
                </Button>
              )}

              {/* Music/Audio */}
              <div className="flex items-center space-x-1">
                <div
                  className={cn(
                    "bg-white rounded-sm flex items-center justify-center",
                    isCompact ? "w-2.5 h-2.5" : "w-3 h-3",
                  )}
                >
                  <div
                    className={cn(
                      "bg-black rounded-sm",
                      isCompact ? "w-1.5 h-1.5" : "w-2 h-2",
                    )}
                  />
                </div>
                <span className={cn("font-medium", audioSize)}>
                  Original audio
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PreviewContainer>
  );
}
