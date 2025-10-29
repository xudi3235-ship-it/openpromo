import { Button } from "@openpromo/ui/components/button";
import {
  Bookmark,
  ExternalLink,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useReelConfig } from "@/hooks/useReelConfig";
import { useReelControls } from "@/hooks/useReelControls";
import { useComposerPreview } from "@/stores/composer-preview-store";
import { CTA_OPTIONS } from "../types/platform-features";
import { PreviewMediaNullState } from "./null-state";

interface FBReelPreviewProps {
  accountId?: string;
}

export function FBReelPreview({ accountId }: FBReelPreviewProps) {
  const previewData = useComposerPreview({
    platform: "FACEBOOK",
    accountId,
    placement: "REEL",
  });

  const {
    isPlaying,
    isMuted,
    hasStreamIframe,
    videoAttachment,
    message,
    togglePlay,
    toggleMute,
    renderVideo,
    renderLocalVideoControls,
  } = useReelControls({ platform: "FACEBOOK", accountId });

  const { config, username, renderAvatar } = useReelConfig(
    "facebook",
    accountId,
    "REEL",
  );
  const ShareIcon = config.icons.share;

  // FB Reels can have CTA buttons
  const callToActionLabel =
    previewData.placement === "FB_REEL" ? previewData.callToActionLabel : null;
  const ctaOption = callToActionLabel
    ? CTA_OPTIONS.find(
        (opt) => opt.label.toLowerCase() === callToActionLabel.toLowerCase(),
      )
    : null;

  return (
    <div className="max-w-[280px] bg-black rounded-lg overflow-hidden relative">
      {/* Video Content */}
      <div className="aspect-[9/16] relative group">
        {videoAttachment ? (
          <div className="w-full h-full relative">
            {/* Render video using hook */}
            {renderVideo()}

            {/* Local video controls (only for local files) */}
            {renderLocalVideoControls()}

            {/* Only show custom controls for local files, not stream iframes */}
            {!hasStreamIframe && (
              <>
                {/* Play/Pause Overlay */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/60 transition-colors"
                      aria-label="Play video"
                    >
                      <Play className="w-8 h-8 text-white ml-1" />
                    </button>
                  </div>
                )}

                {/* Volume Control */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
              </>
            )}

            {/* Actions Sidebar */}
            <div className="absolute right-3 bottom-16 flex flex-col items-center space-y-2">
              {/* Like */}
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 hover:bg-transparent"
                >
                  <Heart className="w-6 h-6 text-white" />
                </Button>
                <span className="text-white text-[10px] font-semibold mt-0.5">
                  {config.engagement.likes}
                </span>
              </div>

              {/* Comment */}
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 hover:bg-transparent"
                >
                  <MessageCircle className="w-6 h-6 text-white" />
                </Button>
                <span className="text-white text-[10px] font-semibold mt-0.5">
                  {config.engagement.comments}
                </span>
              </div>

              {/* Share */}
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 hover:bg-transparent"
                >
                  <ShareIcon className="w-6 h-6 text-white" />
                </Button>
                {config.engagement.shares && (
                  <span className="text-white text-[10px] font-semibold mt-0.5">
                    {config.engagement.shares}
                  </span>
                )}
              </div>

              {/* Save */}
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 hover:bg-transparent"
                >
                  <Bookmark className="w-6 h-6 text-white" />
                </Button>
              </div>

              {/* More */}
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 hover:bg-transparent"
                >
                  <MoreHorizontal className="w-6 h-6 text-white" />
                </Button>
              </div>
            </div>

            {/* Bottom Caption Area */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
              <div className="text-white space-y-2">
                {/* Avatar + Username Row */}
                <div className="flex items-center space-x-2">
                  {renderAvatar()}
                  <span className="font-semibold text-sm">{username}</span>
                  <span
                    className={`text-xs ${config.colors.followButton} px-2 py-0.5 rounded font-medium`}
                  >
                    {config.text.followButton}
                  </span>
                </div>

                {/* Caption */}
                <div className="text-sm line-clamp-2">
                  {message || (
                    <span className="text-white/60">
                      {config.text.placeholder}
                    </span>
                  )}
                </div>

                {/* Call to Action Button */}
                {ctaOption && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full bg-white/90 hover:bg-white text-black font-semibold h-8 text-xs"
                    disabled
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                    <span className="truncate">{ctaOption.label}</span>
                  </Button>
                )}

                {/* Music/Audio */}
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-white rounded-sm flex items-center justify-center">
                    <div className="w-2 h-2 bg-black rounded-sm"></div>
                  </div>
                  <span className="text-xs font-medium">Original audio</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <PreviewMediaNullState
            message="Upload a video to create your reel"
            className="w-full h-full bg-gray-900 flex items-center justify-center"
          />
        )}
      </div>
    </div>
  );
}
