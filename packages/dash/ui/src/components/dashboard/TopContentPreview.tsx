import { Card } from "@openpromo/ui/components/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@openpromo/ui/components/item";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import type { PlacementSpec } from "@shared/content";
import { Link } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { ArrowUpRight } from "lucide-react";
import { getPlatformIcon } from "@/components/content/utils/platform-icons";
import { matchEntity, matchPlacementSpec } from "@/lib/hono-client";

type TopContentPreviewProps = {
  items?: MergedContentEntity[];
  isLoading?: boolean;
  workspaceSlug: string;
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

export function TopContentPreview({
  items,
  isLoading,
  workspaceSlug,
}: TopContentPreviewProps) {
  if (isLoading) {
    return (
      <Card className="border-border/30 p-4 shadow-none">
        <Skeleton className="h-4 w-32" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: ok
            <div key={index} className="flex items-start gap-2.5">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const visibleItems = items?.slice(0, 3) ?? [];

  return (
    <Card className="border-border/30 p-4 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Top content</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ranking by impressions over the past week.
          </p>
        </div>
        <Link
          to="/workspaces/$workspaceSlug/insights"
          params={{ workspaceSlug }}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline whitespace-nowrap"
        >
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {visibleItems.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground">
          Publish or schedule posts to see performance insights here.
        </div>
      ) : (
        <ItemGroup className="mt-3 gap-2">
          {visibleItems.map((item) =>
            matchEntity(item, {
              content: ({ entity }) => {
                const impressions = entity.metrics?.impressions ?? 0;
                const engagement = entity.metrics?.engagement ?? 0;
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
                  <Item
                    key={entity.id}
                    variant="outline"
                    size="sm"
                    className="border-border/30"
                  >
                    <ItemMedia variant="image" className="relative">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={title}
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                          <span className="text-[10px] font-semibold">
                            No image
                          </span>
                        </div>
                      )}
                      {platformIcon && (
                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-sm border">
                          {platformIcon}
                        </div>
                      )}
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="text-xs truncate line-clamp-1 max-w-[200px]">
                        {title}
                      </ItemTitle>
                      <ItemDescription className="text-[10px]">
                        {formatNumber(impressions)} impressions •{" "}
                        {formatNumber(engagement)} engagement
                      </ItemDescription>
                    </ItemContent>
                    <div className="flex flex-col items-end gap-0.5 text-right shrink-0">
                      <p className="text-base font-semibold text-foreground tabular-nums">
                        {formatNumber(impressions)}
                      </p>
                      <p className="text-[9px] text-muted-foreground/70">
                        impressions
                      </p>
                    </div>
                  </Item>
                );
              },
              group: ({ contents, entity }) => {
                const platforms = [
                  ...new Set(contents.map((content) => content.placement)),
                ];
                const primaryMessage =
                  contents.length > 0
                    ? matchPlacementSpec(
                        contents[0].placementSpec as PlacementSpec,
                        {
                          FBFeed: (s) => s.postSpec.message,
                          IGFeed: (s) => s.caption,
                          TTFeed: (s) => s.caption,
                        },
                      )
                    : "Untitled Group";
                const contentWithThumbnail = contents.find((c) =>
                  getThumbnailFromPlacement(c.placementSpec as PlacementSpec),
                );
                const thumbnailUrl = contentWithThumbnail
                  ? getThumbnailFromPlacement(
                      contentWithThumbnail.placementSpec as PlacementSpec,
                    )
                  : undefined;

                return (
                  <Item
                    key={entity.id}
                    variant="outline"
                    size="sm"
                    className="border-border/30"
                  >
                    <ItemMedia variant="image" className="relative">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={primaryMessage || "Group"}
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                          <span className="text-[10px] font-semibold">
                            No image
                          </span>
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 flex">
                        {platforms.slice(0, 2).map((platform, index) => {
                          const icon = getPlatformIcon(platform);
                          return icon ? (
                            <div
                              key={platform}
                              className="bg-background rounded-full p-1 shadow-sm border -ml-1 first:ml-0"
                              style={{ zIndex: platforms.length - index }}
                            >
                              {icon}
                            </div>
                          ) : null;
                        })}
                        {platforms.length > 2 && (
                          <div className="bg-muted rounded-full p-1 shadow-sm border -ml-1 flex items-center justify-center min-w-5 h-5">
                            <span className="text-[10px] font-medium">
                              +{platforms.length - 2}
                            </span>
                          </div>
                        )}
                      </div>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="text-xs truncate line-clamp-1 max-w-[200px]">
                        {primaryMessage || "Campaign group"}
                      </ItemTitle>
                      <ItemDescription className="text-[10px]">
                        {contents.length} placement
                        {contents.length !== 1 ? "s" : ""} • {platforms.length}{" "}
                        platform{platforms.length !== 1 ? "s" : ""}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                );
              },
            }),
          )}
        </ItemGroup>
      )}
    </Card>
  );
}
