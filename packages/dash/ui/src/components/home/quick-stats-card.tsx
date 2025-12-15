import { Skeleton } from "@openpromo/ui/components/skeleton";
import { cn } from "@openpromo/ui/lib/utils";
import type { ReachMomentum } from "@shared/insights";
import { Link } from "@tanstack/react-router";
import { MoveRight, TrendingDown, TrendingUp } from "lucide-react";
import { MomentumCard } from "@/components/momentum/MomentumCard";

type QuickStatsCardProps = {
  workspaceSlug: string;
  reachMomentum?: ReachMomentum;
  isLoading: boolean;
};

export function QuickStatsCard({
  workspaceSlug,
  reachMomentum,
  isLoading,
}: QuickStatsCardProps) {
  if (isLoading) {
    return (
      <MomentumCard tone="subtle" className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </MomentumCard>
    );
  }

  const reach = reachMomentum?.reach ?? 0;
  const deltaPercent = reachMomentum?.deltaPercent ?? 0;
  const hasDelta = typeof reachMomentum?.deltaPercent === "number";
  const isPositive = deltaPercent >= 0;

  const formattedReach = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(reach);

  return (
    <MomentumCard tone="subtle" className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Quick Stats</p>
        <Link
          to="/workspaces/$workspaceSlug/insights"
          params={{ workspaceSlug }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Details
          <MoveRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-border/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Reach</span>
            {hasDelta && (
              <div
                className={cn(
                  "flex items-center gap-0.5 text-xs font-medium",
                  isPositive ? "text-emerald-500" : "text-rose-500",
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(Math.round(deltaPercent * 100))}%
              </div>
            )}
          </div>
          <p className="text-xl font-semibold mt-1">{formattedReach}</p>
        </div>

        <div className="rounded-xl border border-border/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Engagement</span>
          </div>
          <p className="text-xl font-semibold mt-1">
            {reachMomentum?.reach
              ? new Intl.NumberFormat("en-US", {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(Math.round(reach * 0.07))
              : "—"}
          </p>
        </div>
      </div>
    </MomentumCard>
  );
}
