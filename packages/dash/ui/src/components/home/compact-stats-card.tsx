import { Skeleton } from "@openpromo/ui/components/skeleton";
import type { CadenceSummary } from "@shared/insights";
import { Link } from "@tanstack/react-router";
import { BarChart3, MoveRight } from "lucide-react";
import { MomentumCard } from "@/components/momentum/MomentumCard";

type CompactStatsCardProps = {
  cadenceSummary?: CadenceSummary;
  workspaceSlug: string;
  isLoading?: boolean;
};

export function CompactStatsCard({
  cadenceSummary,
  workspaceSlug,
  isLoading,
}: CompactStatsCardProps) {
  if (isLoading) {
    return (
      <MomentumCard className="flex items-center gap-6 py-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-2 flex-1 max-w-xs" />
        <Skeleton className="h-4 w-20" />
      </MomentumCard>
    );
  }

  const hasData = cadenceSummary && cadenceSummary.targetPosts > 0;
  const progressPercent = hasData
    ? Math.min(Math.max(cadenceSummary.progressPercent, 0), 1)
    : 0;
  const completed = cadenceSummary?.completedPosts ?? 0;
  const target = cadenceSummary?.targetPosts ?? 0;

  return (
    <MomentumCard className="flex flex-wrap items-center gap-4 py-4 sm:gap-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">This Week</p>
      </div>

      <div className="flex items-center gap-3 flex-1 min-w-[200px] max-w-md">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Cadence
        </span>
        <div className="flex-1 h-2 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${Math.round(progressPercent * 100)}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-foreground">
          {Math.round(progressPercent * 100)}%
        </span>
      </div>

      {hasData ? (
        <p className="text-xs text-muted-foreground">
          {completed}/{target} posts
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">No goal set</p>
      )}

      <Link
        to="/workspaces/$workspaceSlug/insights"
        params={{ workspaceSlug }}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline ml-auto"
      >
        Review goals
        <MoveRight className="h-3.5 w-3.5" />
      </Link>
    </MomentumCard>
  );
}
