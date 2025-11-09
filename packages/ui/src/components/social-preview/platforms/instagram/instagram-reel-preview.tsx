import { cn } from "@openpromo/ui/lib/utils";
import { useState } from "react";
import {
  CommentsOverlay,
  PreviewContainer,
  PreviewMedia,
} from "../../primitives";
import type {
  BasePreviewProps,
  PreviewData,
  PreviewMediaItem,
} from "../../types";
import { InstagramReelActions } from "./instagram-reel-actions";

export interface InstagramReelPreviewProps extends BasePreviewProps {
  data: PreviewData;
  /** Custom renderer for video/media */
  renderMedia?: (media: PreviewMediaItem, className: string) => React.ReactNode;
  /** Custom share icon component */
  ShareIcon?: React.ComponentType<{ className?: string }>;
}

export function InstagramReelPreview({
  data,
  size = "default",
  renderMedia,
  ShareIcon,
  className,
}: InstagramReelPreviewProps) {
  const {
    accountName,
    profilePicUrl,
    caption,
    media = [],
    metrics,
    firstComment,
  } = data;

  const username = accountName || "instagram";
  const isCompact = size === "thumbnail" || size === "compact";
  const [commentsOpen, setCommentsOpen] = useState(false);

  const avatarSize = isCompact ? "w-6 h-6" : "w-8 h-8";
  const textSize = isCompact ? "text-xs" : "text-sm";
  const captionSize = isCompact ? "text-[10px]" : "text-sm";
  const audioSize = isCompact ? "text-[9px]" : "text-xs";
  const bottomPadding = isCompact ? "p-2" : "p-3";

  // Build comments list
  const comments = firstComment
    ? [
        {
          id: "first-comment",
          accountName: username,
          profilePicUrl,
          text: firstComment,
          isOwner: true,
        },
      ]
    : [];

  return (
    <PreviewContainer size={size} platform="INSTAGRAM" className={className}>
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
          <InstagramReelActions
            size={size}
            likes={metrics?.likes}
            comments={metrics?.comments}
            shares={metrics?.shares}
            ShareIcon={ShareIcon}
            hasNewComments={!!firstComment}
            onCommentsClick={() => setCommentsOpen(true)}
          />

          {/* Comments Overlay */}
          <CommentsOverlay
            isOpen={commentsOpen}
            onClose={() => setCommentsOpen(false)}
            comments={comments}
            size={size}
            platform="INSTAGRAM"
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
                    "rounded-full flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 p-0.5",
                    avatarSize,
                  )}
                >
                  {profilePicUrl ? (
                    <img
                      src={profilePicUrl}
                      alt={username}
                      className="w-full h-full rounded-full object-cover bg-black"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
                      <span
                        className={cn(
                          "font-semibold uppercase",
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
                    "bg-transparent border border-white/80 text-white px-2 py-0.5 rounded font-medium",
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
