import { cn } from "@openpromo/ui/lib/utils";
import { Bookmark, Music2 } from "lucide-react";
import { PreviewContainer, PreviewMedia } from "../../primitives";
import type {
  BasePreviewProps,
  PreviewData,
  PreviewMediaItem,
} from "../../types";
import { TikTokActionSidebar } from "./tiktok-action-sidebar";

export interface TikTokFeedPreviewProps extends BasePreviewProps {
  data: PreviewData;
  /** Custom renderer for attachments */
  renderMedia?: (media: PreviewMediaItem, className: string) => React.ReactNode;
}

const handleFromName = (name?: string | null) =>
  name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "_") : "openpromo";

export function TikTokFeedPreview({
  data,
  size = "default",
  renderMedia,
  className,
}: TikTokFeedPreviewProps) {
  const { accountName, profilePicUrl, caption, media = [], metrics } = data;

  const handle = handleFromName(accountName);
  const displayName = accountName || "TikTok Account";
  const isCompact = size === "thumbnail" || size === "compact";

  const avatarSize = isCompact ? "w-6 h-6" : "w-7 h-7";
  const nameSize = isCompact ? "text-[10px]" : "text-xs";
  const captionSize = isCompact ? "text-[10px]" : "text-xs";
  const metaSize = isCompact ? "text-[9px]" : "text-[11px]";
  const bottomPadding = isCompact ? "px-2 pb-1.5 pt-10" : "px-3 pb-2 pt-12";

  return (
    <PreviewContainer size={size} platform="TIKTOK" className={className}>
      <div className="relative rounded-xl overflow-hidden border border-white/5 bg-[#070708] text-white shadow-[0_20px_45px_-20px_rgba(8,8,11,0.85)]">
        <div className="relative aspect-[9/16]">
          {/* Media Content */}
          <PreviewMedia
            media={media}
            aspectRatio="9/16"
            layout="carousel"
            renderMedia={renderMedia}
            placeholder={
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#0f172a] via-[#0b1020] to-[#04050b] text-white/70">
                <div
                  className={cn(
                    "rounded-xl border border-white/10 bg-white/5 backdrop-blur flex items-center justify-center",
                    isCompact ? "w-12 h-12" : "w-16 h-16",
                  )}
                >
                  <Music2 className={isCompact ? "w-5 h-5" : "w-7 h-7"} />
                </div>
                <p
                  className={cn(
                    "px-6 text-center leading-relaxed",
                    captionSize,
                  )}
                >
                  Upload media to get started
                </p>
              </div>
            }
          />

          {/* Action Sidebar */}
          <TikTokActionSidebar
            size={size}
            likes={metrics?.likes}
            comments={metrics?.comments}
          />

          {/* Bottom Info Section */}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/85 via-30% to-transparent",
              bottomPadding,
            )}
          >
            {/* Author Info */}
            <div
              className={cn(
                "flex items-center gap-2",
                isCompact ? "mb-1" : "mb-2",
              )}
            >
              <div className="relative">
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-pink-500/60 via-red-400/50 to-cyan-400/60 blur" />
                <div
                  className={cn(
                    "relative rounded-full overflow-hidden bg-black/60 backdrop-blur flex items-center justify-center uppercase font-semibold",
                    avatarSize,
                    nameSize,
                  )}
                >
                  {profilePicUrl ? (
                    <img
                      src={profilePicUrl}
                      alt={displayName || handle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{displayName?.charAt(0) || "O"}</span>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "flex items-center gap-1.5 font-semibold",
                    nameSize,
                  )}
                >
                  @{handle}
                  <button
                    type="button"
                    className={cn(
                      "rounded-full border border-white/15 bg-white text-black font-semibold",
                      isCompact
                        ? "text-[8px] px-1.5 py-0.5"
                        : "text-[9px] px-2 py-0.5",
                    )}
                  >
                    Follow
                  </button>
                </div>
                <div className={cn("text-white/70 truncate", metaSize)}>
                  {displayName}
                </div>
              </div>
            </div>

            {/* Caption */}
            {caption && (
              <p
                className={cn(
                  "text-white/90 leading-relaxed line-clamp-2 break-words",
                  captionSize,
                  isCompact ? "mb-1" : "mb-2",
                )}
              >
                {caption}
              </p>
            )}

            {/* Original Sound */}
            <div
              className={cn(
                "flex items-center justify-between text-white/80",
                metaSize,
                isCompact ? "py-1 px-0.5" : "py-1.5 px-1",
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <Music2 className={isCompact ? "w-3 h-3" : "w-3.5 h-3.5"} />
                <span className="truncate max-w-[180px]">
                  Original sound • {displayName}
                </span>
              </div>
              <Bookmark
                className={cn("shrink-0", isCompact ? "w-3 h-3" : "w-4 h-4")}
              />
            </div>
          </div>

          {/* Border Ring */}
          <div className="pointer-events-none absolute inset-0 ring-1 ring-white/5 rounded-xl" />
        </div>
      </div>
    </PreviewContainer>
  );
}
