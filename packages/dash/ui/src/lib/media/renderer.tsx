import { File, Play, Video } from "lucide-react";
import { StreamVideoPreview } from "@/components/composer/stream-video-preview";
import type { MediaItem } from "./types";

// Image renderer
export const ImageRenderer = {
  canRender: (item: MediaItem) => item.type === "image",

  renderThumbnail: (
    item: MediaItem,
    className = "w-full h-full object-cover",
  ) => <img src={item.urls.preview} alt="Image" className={className} />,

  renderPreview: (
    item: MediaItem,
    className = "w-full h-full object-cover",
  ) => (
    <img src={item.urls.preview} alt="Image preview" className={className} />
  ),

  renderPlayer: (
    item: MediaItem,
    className = "max-w-full max-h-[70vh] object-contain rounded-lg",
  ) => (
    <img src={item.urls.preview} alt="Full size image" className={className} />
  ),
};

// Video renderer
export const VideoRenderer = {
  canRender: (item: MediaItem) => item.type === "video",

  renderThumbnail: (
    item: MediaItem,
    className = "w-full h-full object-cover",
  ) => {
    if (item.state === "uploaded" && item.urls.thumbnail) {
      // Show thumbnail with play overlay for uploaded videos
      return (
        <div className="relative">
          <img
            src={item.urls.thumbnail}
            alt="Video thumbnail"
            className={className}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
            <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-black ml-0.5" fill="currentColor" />
            </div>
          </div>
        </div>
      );
    } else {
      // Show video element for local files
      return (
        <>
          <video src={item.urls.preview} className={className} muted />
          <div className="absolute bottom-1 right-1 bg-black/50 rounded p-0.5">
            <Video className="h-2 w-2 text-white" />
          </div>
        </>
      );
    }
  },

  renderPreview: (
    item: MediaItem,
    className = "w-full h-full object-cover",
  ) => {
    return VideoRenderer.renderThumbnail(item, className);
  },

  renderPlayer: (item: MediaItem, className = "") => {
    if (item.state === "uploaded" && item.urls.playback) {
      // Use stream player for uploaded videos
      return (
        <div className="w-full max-w-4xl" style={{ aspectRatio: "16/9" }}>
          <StreamVideoPreview
            iframeUrl={item.urls.playback}
            aspectRatio={item.aspectRatio || "16:9"}
            className={`rounded-lg w-full h-full ${className}`}
          />
        </div>
      );
    } else {
      // Use video element for local files
      return (
        <video
          src={item.urls.preview}
          controls
          className={`max-w-full max-h-[70vh] object-contain rounded-lg ${className}`}
        >
          <track kind="captions" label="auto-generated" />
        </video>
      );
    }
  },
};

// Unknown file renderer
export const UnknownRenderer = {
  canRender: (item: MediaItem) => item.type === "unknown",

  renderThumbnail: (_item: MediaItem, className = "w-full h-full") => (
    <div className={`flex items-center justify-center ${className}`}>
      <File className="h-4 w-4 text-muted-foreground" />
    </div>
  ),

  renderPreview: (item: MediaItem, className = "") =>
    UnknownRenderer.renderThumbnail(item, className),

  renderPlayer: (item: MediaItem, className = "") => (
    <div className={`flex flex-col items-center gap-4 p-8 ${className}`}>
      <File className="h-16 w-16 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {item.file?.name || "Unknown file"}
      </p>
    </div>
  ),
};

// Unified renderer that delegates to specific renderers
export const MediaRenderer = {
  renderThumbnail: (item: MediaItem, className?: string) => {
    if (ImageRenderer.canRender(item))
      return ImageRenderer.renderThumbnail(item, className);
    if (VideoRenderer.canRender(item))
      return VideoRenderer.renderThumbnail(item, className);
    return UnknownRenderer.renderThumbnail(item, className);
  },

  renderPreview: (item: MediaItem, className?: string) => {
    if (ImageRenderer.canRender(item))
      return ImageRenderer.renderPreview(item, className);
    if (VideoRenderer.canRender(item))
      return VideoRenderer.renderPreview(item, className);
    return UnknownRenderer.renderPreview(item, className);
  },

  renderPlayer: (item: MediaItem, className?: string) => {
    if (ImageRenderer.canRender(item))
      return ImageRenderer.renderPlayer(item, className);
    if (VideoRenderer.canRender(item))
      return VideoRenderer.renderPlayer(item, className);
    return UnknownRenderer.renderPlayer(item, className);
  },
};
