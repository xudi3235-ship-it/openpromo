import { cn } from "@openpromo/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { ImageGridCard } from "@/components/common/ImageGrid";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { StyleResponse } from "@/queries/styles-queries";
import { StyleCardActions } from "./style-card-actions";

interface StyleCardProps {
  style: StyleResponse["style"];
}

export function StyleCard({ style }: StyleCardProps) {
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const [primaryImage] = style.imageRefs;
  const imageCount = style.imageRefs.length;

  const isProcessing =
    style.state === "pending" || style.state === "processing";
  const isFailed = style.state === "failed";

  const handleOpen = () => {
    navigate({
      to: "/workspaces/$workspaceSlug/styles/$styleId",
      params: {
        workspaceSlug: workspace.slug,
        styleId: style.id,
      },
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpen();
    }
  };

  return (
    <ImageGridCard
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      aspectRatio="square"
      className="bg-muted/30"
    >
      {/* Main Image */}
      {primaryImage ? (
        <img
          src={primaryImage}
          alt={style.name}
          className={cn(
            "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
            (isProcessing || isFailed) && "blur-sm",
          )}
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted/50">
          <div className="text-4xl opacity-20">🎨</div>
        </div>
      )}

      {/* State Overlay - Processing/Failed */}
      {isProcessing && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-xs font-medium text-white">
              {style.state === "pending" ? "Pending" : "Processing"}
            </p>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-500/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-1.5 px-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/80">
              <span className="text-lg">⚠️</span>
            </div>
            <p className="text-xs font-medium text-red-600">Failed</p>
          </div>
        </div>
      )}

      {/* Official Badge - Minimal Top Badge */}
      {style.isOfficial && (
        <div className="absolute left-3 top-3 z-20">
          <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            <span className="text-xs font-medium text-gray-900">Official</span>
          </div>
        </div>
      )}

      {/* Actions - Top Right */}
      <div className="absolute right-3 top-3 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <StyleCardActions style={style} />
      </div>

      {/* Hover Overlay with Metadata */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="flex h-full flex-col justify-end p-4">
          {/* Title */}
          <h3 className="text-base font-semibold text-white line-clamp-1">
            {style.name}
          </h3>

          {/* Description */}
          {style.description && (
            <p className="mt-1 text-xs text-white/80 line-clamp-2">
              {style.description}
            </p>
          )}

          {/* Metadata */}
          <div className="mt-2 flex items-center gap-2">
            {imageCount > 0 && (
              <span className="text-xs text-white/70">
                {imageCount} {imageCount === 1 ? "image" : "images"}
              </span>
            )}
          </div>
        </div>
      </div>
    </ImageGridCard>
  );
}
