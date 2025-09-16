import { Button } from "@openpromo/ui/components/button";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Play,
  Share,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAttachmentRenderer } from "@/hooks/useAttachmentRenderer";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useComposerStore } from "@/stores/composer-store";

export function FBReelPreview() {
  const { workspace } = useWorkspace();
  const contentCreateData = useComposerStore((s) => s.contentCreateData);
  const { getAttachmentUrl } = useAttachmentRenderer();
  const attachments = contentCreateData.base.attachments ?? [];
  const message = contentCreateData.base.message;
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get the first video attachment for the reel
  const videoAttachment = attachments.find((att) => att.type === "video");

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <div className="max-w-[280px] bg-black rounded-lg overflow-hidden relative">
      {/* Video Content */}
      <div className="aspect-[9/16] relative group">
        {videoAttachment && getAttachmentUrl(videoAttachment) ? (
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              src={getAttachmentUrl(videoAttachment) as string}
              className="w-full h-full object-cover cursor-pointer"
              autoPlay
              loop
              playsInline
              muted={isMuted}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
            >
              <track kind="captions" />
            </video>

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
                  2.1K
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
                  156
                </span>
              </div>

              {/* Share */}
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 hover:bg-transparent"
                >
                  <Share className="w-6 h-6 text-white" />
                </Button>
                <span className="text-white text-[10px] font-semibold mt-0.5">
                  42
                </span>
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
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <div className="w-5 h-5 rounded-full bg-white"></div>
                  </div>
                  <span className="font-semibold text-sm">
                    {workspace?.name || "Your Business Page"}
                  </span>
                  <span className="text-xs bg-blue-600 px-2 py-0.5 rounded font-medium">
                    Follow
                  </span>
                </div>

                {/* Caption */}
                <div className="text-sm line-clamp-2">
                  {message || (
                    <span className="text-white/60">
                      Add a description to your reel...
                    </span>
                  )}
                </div>

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
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <div className="text-center text-white/60">
              <Play className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm">Video preview will appear here</p>
              <p className="text-xs mt-1">Upload a video to create your reel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
