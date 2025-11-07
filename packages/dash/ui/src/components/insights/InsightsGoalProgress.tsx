import { Skeleton } from "@openpromo/ui/components/skeleton";
import type { InsightGoalSummary } from "@shared/insights";
import { MomentumCard } from "@/components/momentum/MomentumCard";

type InsightsGoalProgressProps = {
  goals?: InsightGoalSummary[];
  isLoading?: boolean;
};

export function InsightsGoalProgress({
  goals,
  isLoading,
}: InsightsGoalProgressProps) {
  if (isLoading) {
    return (
      <MomentumCard>
        <Skeleton className="h-5 w-32 mb-4 rounded" />
        <div className="space-y-3">
          {["goal-skeleton-one", "goal-skeleton-two"].map((key) => (
            <div key={key} className="space-y-2">
              <Skeleton className="h-4 w-48 rounded" />
              <Skeleton className="h-3 w-full rounded" />
            </div>
          ))}
        </div>
      </MomentumCard>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <MomentumCard>
        <h2 className="font-medium text-foreground mb-1">Goals</h2>
        <p className="text-sm text-muted-foreground">
          Set a cadence or reach goal to start tracking your streaks.
        </p>
      </MomentumCard>
    );
  }

  return (
    <MomentumCard className="space-y-4">
      <div>
        <h2 className="font-medium text-foreground">Goals</h2>
        <p className="text-xs text-muted-foreground">
          Live progress and streaks for your active goals
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {goals.map((goal) => {
          const percent = Math.min(1, Math.max(goal.progressPercent ?? 0, 0));
          return (
            <div
              key={goal.goalId}
              className="space-y-3 rounded-2xl border border-border/40 p-4"
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                <span>{goal.status.replace("_", " ")}</span>
                {goal.streak ? (
                  <span className="text-emerald-500">
                    {goal.streak} wk streak
                  </span>
                ) : null}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-foreground">
                  {(percent * 100).toFixed(0)}
                </span>
                <span className="text-xs text-muted-foreground">
                  % complete
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${percent * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </MomentumCard>
  );
}
