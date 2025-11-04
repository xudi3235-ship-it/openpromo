/** biome-ignore-all lint/suspicious/noArrayIndexKey: skeleton */
import { cn } from "@openpromo/ui/lib/utils";
import type { PreviewMediaItem } from "../types";

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
}

export function PreviewMedia({
  media = [],
  aspectRatio = "1/1",
  objectFit = "cover",
  placeholder,
  className,
  renderMedia,
  layout = "single",
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
      <video
        src={mediaItem.url}
        poster={mediaItem.thumbnailUrl}
        className={mediaClassName}
        controls={false}
        muted
        loop
      />
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

  // Carousel layout (Instagram/TikTok) - show first with indicator
  if (layout === "carousel") {
    return (
      <div className={cn("relative", aspectRatioClass, className)}>
        {renderSingleMedia(media[0], "w-full h-full")}
        {media.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            1/{media.length}
          </div>
        )}
      </div>
    );
  }

  // Collage layout (Facebook)
  if (layout === "collage") {
    // Single image in collage mode
    if (media.length === 1) {
      return (
        <div className={cn("w-full rounded-lg overflow-hidden", className)}>
          {renderSingleMedia(media[0], "w-full h-64 object-cover")}
        </div>
      );
    }

    // Two images - side by side
    if (media.length === 2) {
      return (
        <div className={cn("w-full rounded-lg overflow-hidden", className)}>
          <div className="grid grid-cols-2 gap-1 h-64">
            {media.slice(0, 2).map((item, index) => (
              <div key={index} className="w-full h-full overflow-hidden">
                {renderSingleMedia(item, "w-full h-full object-cover")}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Three images - large left, two stacked right
    if (media.length === 3) {
      return (
        <div className={cn("w-full rounded-lg overflow-hidden", className)}>
          <div className="grid grid-cols-2 gap-1 h-64">
            <div className="w-full h-full overflow-hidden">
              {renderSingleMedia(media[0], "w-full h-full object-cover")}
            </div>
            <div className="grid grid-rows-2 gap-1 h-full">
              {media.slice(1, 3).map((item, index) => (
                <div key={index + 1} className="w-full h-full overflow-hidden">
                  {renderSingleMedia(item, "w-full h-full object-cover")}
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
        <div className={cn("w-full rounded-lg overflow-hidden", className)}>
          <div className="grid grid-cols-2 gap-1 h-64">
            {media.slice(0, 3).map((item, index) => (
              <div key={index} className="w-full h-full overflow-hidden">
                {renderSingleMedia(item, "w-full h-full object-cover")}
              </div>
            ))}
            <div className="relative w-full h-full overflow-hidden">
              {renderSingleMedia(media[3], "w-full h-full object-cover")}
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
