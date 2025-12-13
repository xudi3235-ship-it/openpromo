/** biome-ignore-all lint/suspicious/noArrayIndexKey: skeleton */
import { cn } from "@openpromo/ui/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { PreviewMediaItem } from "../types";
import { VideoWithMuteButton } from "./video-with-mute-button";

export type MediaLayout = "single" | "collage" | "carousel";

export interface PreviewMediaProps {
  media?: PreviewMediaItem[];
  aspectRatio?: "9/16" | "4/5" | "3/4" | "1/1" | "16/9";
  objectFit?: "cover" | "contain";
  placeholder?: React.ReactNode;
  className?: string;
  /** Custom render function for media items */
  renderMedia?: (media: PreviewMediaItem, className: string) => React.ReactNode;
  /** Layout mode: single (first item only), collage (FB grid), carousel (IG/TikTok swipe) */
  layout?: MediaLayout;
  /** Whether to show mute button for videos (default: false) */
  showMuteButton?: boolean;
  /** Size of the preview component (affects mute button size) */
  size?: "default" | "compact" | "thumbnail" | "large";
  /** Indicator style for carousel: dots (Instagram) or bars (TikTok) */
  indicatorStyle?: "dots" | "bars";
}

export function PreviewMedia({
  media = [],
  aspectRatio = "1/1",
  objectFit = "cover",
  placeholder,
  className,
  renderMedia,
  layout = "single",
  showMuteButton = false,
  size = "default",
  indicatorStyle = "dots",
}: PreviewMediaProps) {
  // Map aspect ratio to Tailwind classes
  const aspectRatioClass = {
    "9/16": "aspect-[9/16]",
    "4/5": "aspect-[4/5]",
    "3/4": "aspect-[3/4]",
    "1/1": "aspect-square",
    "16/9": "aspect-video",
  }[aspectRatio];

  if (media.length === 0 && placeholder) {
    return <div className={cn("w-full h-full", className)}>{placeholder}</div>;
  }

  if (media.length === 0) {
    return (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center bg-muted/20",
          aspectRatioClass,
          className,
        )}
      >
        <div className="text-center text-muted-foreground text-sm">
          <svg
            className="mx-auto h-12 w-12 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Upload media
        </div>
      </div>
    );
  }

  const renderSingleMedia = (
    mediaItem: PreviewMediaItem,
    className: string,
  ) => {
    const mediaClassName = cn(
      className,
      objectFit === "cover" ? "object-cover" : "object-contain",
    );

    if (renderMedia) {
      return renderMedia(mediaItem, mediaClassName);
    }

    return mediaItem.type === "video" ? (
      showMuteButton ? (
        <VideoWithMuteButton
          src={mediaItem.url}
          poster={mediaItem.thumbnailUrl}
          className={mediaClassName}
          loop={true}
          objectFit={objectFit}
          showMuteButton={showMuteButton}
          size={size}
        />
      ) : (
        <video
          src={mediaItem.url}
          poster={mediaItem.thumbnailUrl}
          className={mediaClassName}
          controls={false}
          muted
          loop
        />
      )
    ) : (
      <img src={mediaItem.url} alt="Preview" className={mediaClassName} />
    );
  };

  // Single layout mode - always show first image only
  if (layout === "single") {
    return (
      <div className={cn(aspectRatioClass, className)}>
        {renderSingleMedia(media[0], "w-full h-full")}
      </div>
    );
  }

  // Carousel layout (Instagram/TikTok) - show with navigation
  if (layout === "carousel") {
    return (
      <CarouselLayout
        media={media}
        aspectRatioClass={aspectRatioClass}
        className={className}
        renderSingleMedia={renderSingleMedia}
        size={size}
        indicatorStyle={indicatorStyle}
      />
    );
  }

  // Collage layout (Facebook)
  if (layout === "collage") {
    // Single image in collage mode
    if (media.length === 1) {
      return (
        <div
          className={cn("w-full h-full rounded-lg overflow-hidden", className)}
        >
          {renderSingleMedia(
            media[0],
            "w-full h-full object-cover object-center",
          )}
        </div>
      );
    }

    // Two images - side by side
    if (media.length === 2) {
      return (
        <div
          className={cn("w-full h-full rounded-lg overflow-hidden", className)}
        >
          <div className="grid grid-cols-2 gap-0.5 h-full">
            {media.slice(0, 2).map((item, index) => (
              <div key={index} className="w-full h-full overflow-hidden">
                {renderSingleMedia(
                  item,
                  "w-full h-full object-cover object-center",
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Three images - large top, two side-by-side bottom (Facebook style)
    if (media.length === 3) {
      return (
        <div
          className={cn("w-full h-full rounded-lg overflow-hidden", className)}
        >
          <div className="h-full flex flex-col gap-0.5">
            {/* Large top image - takes 60% */}
            <div className="w-full flex-[3] min-h-0 overflow-hidden">
              {renderSingleMedia(
                media[0],
                "w-full h-full object-cover object-center",
              )}
            </div>
            {/* Two side-by-side bottom images - takes 40% */}
            <div className="grid grid-cols-2 gap-0.5 flex-[2] min-h-0">
              {media.slice(1, 3).map((item, index) => (
                <div key={index + 1} className="w-full h-full overflow-hidden">
                  {renderSingleMedia(
                    item,
                    "w-full h-full object-cover object-center",
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Four or more images - 2x2 grid with "+X more" overlay
    if (media.length >= 4) {
      return (
        <div
          className={cn("w-full h-full rounded-lg overflow-hidden", className)}
        >
          <div className="grid grid-cols-2 gap-0.5 h-full">
            {media.slice(0, 3).map((item, index) => (
              <div key={index} className="w-full h-full overflow-hidden">
                {renderSingleMedia(
                  item,
                  "w-full h-full object-cover object-center",
                )}
              </div>
            ))}
            <div className="relative w-full h-full overflow-hidden">
              {renderSingleMedia(
                media[3],
                "w-full h-full object-cover object-center",
              )}
              {media.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    +{media.length - 4}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  // Fallback: just show first image
  return (
    <div className={cn(aspectRatioClass, className)}>
      {renderSingleMedia(media[0], "w-full h-full")}
    </div>
  );
}

/** Internal carousel component with navigation state */
function CarouselLayout({
  media,
  aspectRatioClass,
  className,
  renderSingleMedia,
  size,
  indicatorStyle,
}: {
  media: PreviewMediaItem[];
  aspectRatioClass: string;
  className?: string;
  renderSingleMedia: (
    item: PreviewMediaItem,
    className: string,
  ) => React.ReactNode;
  size: "default" | "compact" | "thumbnail" | "large";
  indicatorStyle: "dots" | "bars";
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isCompact = size === "thumbnail" || size === "compact";

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className={cn("relative group", aspectRatioClass, className)}>
      {renderSingleMedia(media[currentIndex], "w-full h-full")}

      {/* Navigation Controls - only show when multiple media */}
      {media.length > 1 && (
        <>
          {/* Left Arrow */}
          <button
            type="button"
            onClick={goToPrevious}
            className={cn(
              "absolute left-1 top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70",
              isCompact ? "w-5 h-5" : "w-7 h-7",
            )}
            aria-label="Previous"
          >
            <ChevronLeft className={isCompact ? "w-3 h-3" : "w-4 h-4"} />
          </button>

          {/* Right Arrow */}
          <button
            type="button"
            onClick={goToNext}
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70",
              isCompact ? "w-5 h-5" : "w-7 h-7",
            )}
            aria-label="Next"
          >
            <ChevronRight className={isCompact ? "w-3 h-3" : "w-4 h-4"} />
          </button>

          {/* Indicator badge */}
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            {currentIndex + 1}/{media.length}
          </div>

          {/* Progress indicators - bars or dots */}
          {indicatorStyle === "bars" ? (
            <div className="absolute bottom-3 left-3 right-3 flex gap-1 z-20">
              {media.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "flex-1 rounded-full transition-all",
                    isCompact ? "h-0.5" : "h-1",
                    index === currentIndex
                      ? "bg-white"
                      : "bg-white/40 hover:bg-white/60",
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          ) : (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
              {media.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "rounded-full transition-all",
                    isCompact ? "w-1 h-1" : "w-1.5 h-1.5",
                    index === currentIndex
                      ? "bg-white"
                      : "bg-white/50 hover:bg-white/70",
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
