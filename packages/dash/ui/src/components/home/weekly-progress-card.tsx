import { Skeleton } from "@openpromo/ui/components/skeleton";
import type { CadenceSummary, InsightGoalSummary } from "@shared/insights";
import { Link } from "@tanstack/react-router";
import { differenceInHours, endOfWeek } from "date-fns";
import { Clock, Flame, MoveRight, Target } from "lucide-react";
import { MomentumCard } from "@/components/momentum/MomentumCard";

type WeeklyProgressCardProps = {
  workspaceSlug: string;
  cadenceSummary?: CadenceSummary;
  primaryGoal?: InsightGoalSummary;
  isLoading: boolean;
};

export function WeeklyProgressCard({
  workspaceSlug,
  cadenceSummary,
  primaryGoal,
  isLoading,
}: WeeklyProgressCardProps) {
  const hoursLeft = differenceInHours(endOfWeek(new Date()), new Date());
  const streak = primaryGoal?.streak ?? 0;
  const progressPercent = Math.min(
    Math.max(cadenceSummary?.progressPercent ?? 0, 0),
    1,
  );
  const completedPosts = cadenceSummary?.completedPosts ?? 0;
  const targetPosts = cadenceSummary?.targetPosts ?? 5;

  if (isLoading) {
    return (
      <MomentumCard className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </MomentumCard>
    );
  }

  return (
    <MomentumCard className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Weekly Progress</h3>
            <p className="text-xs text-muted-foreground">
              Track your posting cadence and goals
            </p>
          </div>
        </div>
        <Link
          to="/workspaces/$workspaceSlug/insights"
          params={{ workspaceSlug }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View insights
          <MoveRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Weekly Plan Section */}
        <div className="rounded-xl border border-border/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{hoursLeft} hours left this week</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">
                {completedPosts}/{targetPosts} posts
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent * 100}%` }}
              />
            </div>
          </div>
          {completedPosts < targetPosts && (
            <p className="text-xs text-muted-foreground">
              {targetPosts - completedPosts} more{" "}
              {targetPosts - completedPosts === 1 ? "post" : "posts"} to hit
              your goal
            </p>
          )}
        </div>

        {/* Weekly Goal Section */}
        <div className="rounded-xl border border-border/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {Math.round(progressPercent * 100)}%
            </span>
            {streak > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                <Flame className="h-3 w-3" />
                {streak} week streak
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {progressPercent >= 1
              ? "Goal achieved! Keep the momentum going."
              : "Stay on track to protect your streak"}
          </p>
          <Link
            to="/workspaces/$workspaceSlug/composer"
            params={{ workspaceSlug }}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Queue a post
            <MoveRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </MomentumCard>
  );
}
