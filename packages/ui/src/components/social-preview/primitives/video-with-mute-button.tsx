import { cn } from "@openpromo/ui/lib/utils";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface VideoWithMuteButtonProps {
  src?: string;
  poster?: string;
  className?: string;
  muted?: boolean;
  loop?: boolean;
  objectFit?: "cover" | "contain";
  showMuteButton?: boolean;
  size?: "default" | "compact" | "thumbnail" | "large";
}

export function VideoWithMuteButton({
  src,
  poster,
  className,
  muted: initialMuted = true,
  loop = true,
  objectFit = "cover",
  showMuteButton = true,
  size = "default",
}: VideoWithMuteButtonProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    video.muted = isMuted;

    // Autoplay when video loads
    const handleLoadedData = () => {
      video.play().catch(() => {
        // Autoplay was prevented, that's okay
      });
    };

    video.addEventListener("loadeddata", handleLoadedData);

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
    };
  }, [src, isMuted]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
    }
  };

  const buttonSize =
    size === "compact"
      ? "w-6 h-6"
      : size === "thumbnail"
        ? "w-5 h-5"
        : "w-8 h-8";
  const iconSize =
    size === "compact"
      ? "w-3 h-3"
      : size === "thumbnail"
        ? "w-2.5 h-2.5"
        : "w-4 h-4";

  if (!src) {
    return null;
  }

  return (
    <div
      className={cn("relative w-full h-full", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={cn(
          "w-full h-full",
          objectFit === "cover" ? "object-cover" : "object-contain",
        )}
        controls={false}
        muted={isMuted}
        loop={loop}
        playsInline
      />

      {showMuteButton && (
        <button
          onClick={toggleMute}
          className={cn(
            "absolute top-3 right-3 flex items-center justify-center",
            "bg-black/50 hover:bg-black/70 text-white",
            "rounded-full transition-all duration-200",
            buttonSize,
            isHovered || isMuted ? "opacity-100" : "opacity-0",
          )}
        >
          {isMuted ? (
            <VolumeX className={iconSize} />
          ) : (
            <Volume2 className={iconSize} />
          )}
        </button>
      )}
    </div>
  );
}
