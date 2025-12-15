import { Skeleton } from "@openpromo/ui/components/skeleton";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { MomentumCard } from "@/components/momentum/MomentumCard";
import { TopContentCard } from "./TopContentCard";

type TopContentGridProps = {
  items?: MergedContentEntity[];
  isLoading?: boolean;
  workspaceSlug: string;
  limit?: number;
};

export function TopContentGrid({
  items,
  isLoading,
  workspaceSlug,
  limit = 4,
}: TopContentGridProps) {
  if (isLoading) {
    return (
      <MomentumCard className="space-y-4">
        <div>
          <Skeleton className="h-5 w-28 rounded" />
          <Skeleton className="h-3 w-48 mt-1 rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["a", "b", "c", "d"].slice(0, limit).map((key) => (
            <div
              key={key}
              className="rounded-xl border border-border/40 overflow-hidden"
            >
              <Skeleton className="aspect-square" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </MomentumCard>
    );
  }

  const visibleItems = items?.slice(0, limit) ?? [];

  if (visibleItems.length === 0) {
    return (
      <MomentumCard className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">Top content</h3>
          <p className="text-xs text-muted-foreground">
            Your best performing posts
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Publish content to see your top performers here.
          </p>
        </div>
      </MomentumCard>
    );
  }

  return (
    <MomentumCard className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Top content</h3>
        <p className="text-xs text-muted-foreground">
          Your best performing posts this period
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {visibleItems.map((item, idx) => (
          <TopContentCard
            key={item.entity.id}
            item={item}
            workspaceSlug={workspaceSlug}
            rank={idx + 1}
          />
        ))}
      </div>
    </MomentumCard>
  );
}
