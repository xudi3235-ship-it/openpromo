import { Stream } from "@cloudflare/stream-react";
import { memo } from "react";

interface StreamVideoPreviewProps {
  iframeUrl?: string; // Keep for backward compatibility
  videoId?: string; // New prop for direct video ID
  className?: string;
  aspectRatio?: string;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export const StreamVideoPreview = memo(function StreamVideoPreview({
  iframeUrl,
  videoId,
  className = "",
  aspectRatio = "16:9",
  autoplay = true,
  controls = false,
  loop = true,
  muted = true,
}: StreamVideoPreviewProps) {
  // Extract video ID from iframe URL if not provided directly
  const getVideoId = () => {
    if (videoId) return videoId;

    if (iframeUrl) {
      // Extract video ID from iframe URL like:
      // https://iframe.videodelivery.net/VIDEO_ID or
      // https://customer-CODE.cloudflarestream.com/VIDEO_ID/iframe
      const match = iframeUrl.match(/\/([a-f0-9]{32})/);
      return match ? match[1] : null;
    }

    return null;
  };

  const streamVideoId = getVideoId();

  if (!streamVideoId) {
    // Fallback to iframe for backward compatibility
    return (
      <div
        className={`relative ${className}`}
        style={{ paddingTop: aspectRatio === "16:9" ? "56.25%" : "100%" }}
      >
        <iframe
          src={iframeUrl}
          className="absolute inset-0 w-full h-full border-0 rounded-lg"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
          title="Video preview"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <Stream
        src={streamVideoId}
        autoplay={autoplay}
        controls={controls}
        loop={loop}
        muted={muted}
        responsive={true}
        preload="auto"
      />
    </div>
  );
});
