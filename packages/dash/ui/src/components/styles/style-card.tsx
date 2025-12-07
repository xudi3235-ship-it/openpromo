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
          <div className="flex h-full flex-col justify-between p-3">
            {/* Top - Title and description */}
            <div />

            {/* Bottom - Info and action */}
            <div className="space-y-2">
              <div>
                <h3 className="text-sm font-medium text-white line-clamp-1">
                  {style.name}
                </h3>
                {style.description && (
                  <p className="mt-0.5 text-xs text-white/70 line-clamp-1">
                    {style.description}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between">
                {imageCount > 0 && (
                  <span className="text-xs text-white/60">
                    {imageCount} {imageCount === 1 ? "image" : "images"}
                  </span>
                )}
                <StyleCardActions style={style} showUseButton />
              </div>
            </div>
          </div>
        </GridCardHoverOverlay>
      </GridCardMedia>
    </GridCard>
  );
}
