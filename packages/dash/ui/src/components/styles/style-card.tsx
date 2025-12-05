import { cn } from "@openpromo/ui/lib/utils";
import {
  GridCard,
  GridCardActions,
  GridCardBadges,
  GridCardHoverOverlay,
  GridCardMedia,
  GridCardOfficialBadge,
  GridCardStateOverlay,
} from "@/components/common";
import type { StyleResponse } from "@/queries/styles-queries";
import { StyleCardActions } from "./style-card-actions";

interface StyleCardProps {
  style: StyleResponse["style"];
}

export function StyleCard({ style }: StyleCardProps) {
  const [primaryImage] = style.imageRefs;
  const imageCount = style.imageRefs.length;

  const isProcessing =
    style.state === "pending" || style.state === "processing";
  const isFailed = style.state === "failed";

  return (
    <GridCard className="bg-muted/30">
      <GridCardBadges>
        {style.isOfficial && <GridCardOfficialBadge />}
      </GridCardBadges>

      <GridCardActions>
        <StyleCardActions style={style} />
      </GridCardActions>

      <GridCardMedia>
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

        {isProcessing && (
          <GridCardStateOverlay
            state="processing"
            message={style.state === "pending" ? "Pending" : "Processing"}
          />
        )}
        {isFailed && <GridCardStateOverlay state="failed" />}

        <GridCardHoverOverlay>
          <div className="flex h-full flex-col justify-end p-4">
            <h3 className="text-base font-semibold text-white line-clamp-1">
              {style.name}
            </h3>

            {style.description && (
              <p className="mt-1 text-xs text-white/80 line-clamp-2">
                {style.description}
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              {imageCount > 0 && (
                <span className="text-xs text-white/70">
                  {imageCount} {imageCount === 1 ? "image" : "images"}
                </span>
              )}
            </div>

            <div className="mt-3 -mx-4 -mb-4 px-4 py-3 bg-gradient-to-t from-black/60 to-transparent">
              <StyleCardActions style={style} showUseButton />
            </div>
          </div>
        </GridCardHoverOverlay>
      </GridCardMedia>
    </GridCard>
  );
}
