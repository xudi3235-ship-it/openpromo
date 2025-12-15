import type { PlacementSpec } from "@shared/content";
import { Link } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { getPlatformIcon } from "@/components/content/utils/platform-icons";
import { matchEntity, matchPlacementSpec } from "@/lib/hono-client";

type TopContentCardProps = {
  item: MergedContentEntity;
  workspaceSlug: string;
  rank?: number;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatNumber(value: number | null | undefined) {
  if (!value) return "0";
  return numberFormatter.format(value);
}

function getThumbnailFromPlacement(
  placementSpec: PlacementSpec,
): string | undefined {
  if (placementSpec?.thumbnailUrl) {
    return placementSpec.thumbnailUrl;
  }

  const attachments = placementSpec?.attachments;
  if (attachments && attachments.length > 0) {
    const fst = attachments.find((att) => att.publicUrl);
    if (fst?.publicUrl) {
      return fst.publicUrl;
    }
  }

  return undefined;
}

export function TopContentCard({
  item,
  workspaceSlug,
  rank,
}: TopContentCardProps) {
  return matchEntity(item, {
    content: ({ entity }) => {
      const impressions = entity.metrics?.impressions ?? 0;
      const reach = entity.metrics?.reach ?? impressions;
      const platformIcon = getPlatformIcon(entity.placement);
      const thumbnail = getThumbnailFromPlacement(
        entity.placementSpec as PlacementSpec,
      );

      const message = matchPlacementSpec(
        entity.placementSpec as PlacementSpec,
        {
          FBFeed: (s) => s.postSpec.message,
          IGFeed: (s) => s.caption,
          TTFeed: (s) => s.caption,
        },
      );
      const title = message || "Untitled";

      return (
        <Link
          to="/workspaces/$workspaceSlug/content/$contentId"
          params={{ workspaceSlug, contentId: entity.id }}
          className="group block"
        >
          <div className="rounded-xl border border-border/40 overflow-hidden bg-card transition-colors hover:border-border/80">
            {/* Thumbnail */}
            <div className="relative aspect-square bg-muted">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <span className="text-xs font-medium">No image</span>
                </div>
              )}

              {/* Rank badge */}
              {rank !== undefined && (
                <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-semibold">
                  #{rank}
                </div>
              )}

              {/* Platform icon */}
              {platformIcon && (
                <div className="absolute bottom-2 right-2 bg-background rounded-full p-1.5 shadow-sm border">
                  {platformIcon}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-3 space-y-1">
              <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {title}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(reach)} reach
              </p>
            </div>
          </div>
        </Link>
      );
    },
    group: ({ contents, entity }) => {
      const platforms = [
        ...new Set(contents.map((content) => content.placement)),
      ];
      const primaryMessage =
        contents.length > 0
          ? matchPlacementSpec(contents[0].placementSpec as PlacementSpec, {
              FBFeed: (s) => s.postSpec.message,
              IGFeed: (s) => s.caption,
              TTFeed: (s) => s.caption,
            })
          : "Untitled Group";

      const contentWithThumbnail = contents.find((c) =>
        getThumbnailFromPlacement(c.placementSpec as PlacementSpec),
      );
      const thumbnailUrl = contentWithThumbnail
        ? getThumbnailFromPlacement(
            contentWithThumbnail.placementSpec as PlacementSpec,
          )
        : undefined;

      // Aggregate metrics from all contents in group
      const totalReach = contents.reduce(
        (sum, c) => sum + (c.metrics?.reach ?? c.metrics?.impressions ?? 0),
        0,
      );

      return (
        <Link
          to="/workspaces/$workspaceSlug/content/$contentId"
          params={{ workspaceSlug, contentId: entity.id }}
          className="group block"
        >
          <div className="rounded-xl border border-border/40 overflow-hidden bg-card transition-colors hover:border-border/80">
            {/* Thumbnail */}
            <div className="relative aspect-square bg-muted">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={primaryMessage || "Group"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <span className="text-xs font-medium">No image</span>
                </div>
              )}

              {/* Rank badge */}
              {rank !== undefined && (
                <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-semibold">
                  #{rank}
                </div>
              )}

              {/* Platform icons */}
              <div className="absolute bottom-2 right-2 flex -space-x-1">
                {platforms.slice(0, 3).map((platform) => {
                  const icon = getPlatformIcon(platform);
                  return icon ? (
                    <div
                      key={platform}
                      className="bg-background rounded-full p-1.5 shadow-sm border"
                    >
                      {icon}
                    </div>
                  ) : null;
                })}
                {platforms.length > 3 && (
                  <div className="bg-muted rounded-full px-1.5 py-0.5 shadow-sm border flex items-center justify-center">
                    <span className="text-[10px] font-medium">
                      +{platforms.length - 3}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-1">
              <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {primaryMessage || "Campaign group"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(totalReach)} reach • {platforms.length} platform
                {platforms.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </Link>
      );
    },
  });
}
