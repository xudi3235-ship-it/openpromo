import { cn } from "@openpromo/ui/lib/utils";
import type { PreviewMediaItem } from "../types";

export interface PreviewMediaProps {
  media?: PreviewMediaItem[];
  aspectRatio?: "9/16" | "4/5" | "3/4" | "1/1" | "16/9";
  objectFit?: "cover" | "contain";
  placeholder?: React.ReactNode;
  className?: string;
  /** Custom render function for media items */
  renderMedia?: (media: PreviewMediaItem, className: string) => React.ReactNode;
}

export function PreviewMedia({
  media = [],
  aspectRatio = "1/1",
  objectFit = "cover",
  placeholder,
  className,
  renderMedia,
}: PreviewMediaProps) {
  const currentMedia = media[0];

  if (!currentMedia && placeholder) {
    return <div className={cn("w-full h-full", className)}>{placeholder}</div>;
  }

  if (!currentMedia) {
    return (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center bg-muted/20",
          `aspect-[${aspectRatio}]`,
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

  if (renderMedia) {
    return (
      <div className={cn(`aspect-[${aspectRatio}]`, className)}>
        {renderMedia(
          currentMedia,
          cn(
            "w-full h-full",
            objectFit === "cover" ? "object-cover" : "object-contain",
          ),
        )}
      </div>
    );
  }

  const mediaClassName = cn(
    "w-full h-full",
    objectFit === "cover" ? "object-cover" : "object-contain",
  );

  return (
    <div className={cn(`aspect-[${aspectRatio}]`, className)}>
      {currentMedia.type === "video" ? (
        <video
          src={currentMedia.url}
          poster={currentMedia.thumbnailUrl}
          className={mediaClassName}
          controls={false}
          muted
          loop
        />
      ) : (
        <img src={currentMedia.url} alt="Preview" className={mediaClassName} />
      )}
    </div>
  );
}
