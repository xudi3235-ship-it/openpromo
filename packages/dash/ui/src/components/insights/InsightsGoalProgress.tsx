import { Skeleton } from "@openpromo/ui/components/skeleton";
import type { InsightGoalSummary } from "@shared/insights";

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
      <div className="bg-card rounded-lg p-6 border border-border/40">
        <Skeleton className="h-5 w-32 mb-4 rounded" />
        <div className="space-y-3">
          {["goal-skeleton-one", "goal-skeleton-two"].map((key) => (
            <div key={key} className="space-y-2">
              <Skeleton className="h-4 w-48 rounded" />
              <Skeleton className="h-3 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border/40">
        <h2 className="font-medium text-foreground mb-1">Goals</h2>
        <p className="text-sm text-muted-foreground">
          Set a cadence or reach goal to start tracking your streaks.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 border border-border/40 space-y-4">
      <div>
        <h2 className="font-medium text-foreground">Goals</h2>
        <p className="text-xs text-muted-foreground">
          Live progress and streaks for your active goals
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => {
          const percent = Math.min(1, Math.max(goal.progressPercent ?? 0, 0));
          return (
            <div
              key={goal.goalId}
              className="border border-border/40 rounded-lg p-4 bg-background"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium capitalize">
                  {goal.status.replace("_", " ")}
                </p>
                {goal.streak ? (
                  <span className="text-xs text-emerald-500">
                    {goal.streak} week streak
                  </span>
                ) : null}
              </div>
              <div className="text-2xl font-semibold mb-2">
                {(percent * 100).toFixed(0)}%
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${percent * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
