import { Badge } from "@openpromo/ui/components/badge";
import type { StyleResponse } from "@/queries/styles";

interface StyleCardProps {
  style: StyleResponse["style"];
}

export function StyleCard({ style }: StyleCardProps) {
  const [primaryImage, ...otherRefs] = style.imageRefs;
  const imageCount = style.imageRefs.length;

  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-muted transition-all duration-300 hover:shadow-xl">
      {/* Main Image */}
      {primaryImage ? (
        <img
          src={primaryImage}
          alt={style.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
          <div className="text-6xl opacity-30">🎨</div>
        </div>
      )}

      {/* Image Count Badge - Always visible */}
      {imageCount > 0 && (
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {imageCount} {imageCount === 1 ? "image" : "images"}
        </div>
      )}

      {/* Overlay with metadata - Appears on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="flex h-full flex-col justify-end p-4">
          {/* Title */}
          <h3 className="mb-2 text-lg font-bold text-white">{style.name}</h3>

          {/* Description */}
          <p className="mb-3 text-sm text-white/90 line-clamp-2">
            {style.description}
          </p>

          {/* Metadata row */}
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-white/20 text-xs text-white backdrop-blur-sm hover:bg-white/30"
            >
              {style.slug}
            </Badge>
          </div>

          {/* Prompt preview */}
          {style.imageGenPrompt && (
            <p className="mt-3 text-xs text-white/70 line-clamp-2">
              {style.imageGenPrompt}
            </p>
          )}

          {/* Additional images preview */}
          {otherRefs.length > 0 && (
            <div className="mt-3 flex gap-1">
              {otherRefs.slice(0, 3).map((ref, idx) => (
                <div
                  key={ref}
                  className="h-8 w-8 overflow-hidden rounded border border-white/20 bg-black/20 backdrop-blur-sm"
                >
                  <img
                    src={ref}
                    alt={`${style.name} ${idx + 2}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
              {otherRefs.length > 3 && (
                <div className="flex h-8 w-8 items-center justify-center rounded border border-white/20 bg-black/40 text-xs text-white backdrop-blur-sm">
                  +{otherRefs.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
