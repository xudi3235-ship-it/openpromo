import { Skeleton } from "@openpromo/ui/components/skeleton";
import { cn } from "@openpromo/ui/lib/utils";
import type { InsightGoalSummary } from "@shared/insights";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { format } from "date-fns";
import {
  CalendarClock,
  CheckCircle2,
  CircleCheckBig,
  ListChecks,
  MailCheck,
  MoveRight,
  Rocket,
  Target,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import { HomeHeroCard } from "@/components/home/HomeHeroCard";
import { InsightsSummaryCards } from "@/components/insights/InsightsSummaryCards";
import {
  InsightsTopContent,
  InsightsTopContentSkeleton,
} from "@/components/insights/InsightsTopContent";
import { MomentumCard } from "@/components/momentum/MomentumCard";
import { useWorkspace } from "@/hooks/useWorkspace";
import { matchEntity } from "@/lib/hono-client";
import {
  useWorkspaceInsightSnapshot,
  useWorkspaceInsightsInboxSummary,
  useWorkspaceInsightsTopContent,
} from "@/queries/insights";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/",
)({
  component: WorkspaceHomePage,
});

function WorkspaceHomePage() {
  const { workspace } = useWorkspace();
  const { data: snapshotRecord, isPending: snapshotPending } =
    useWorkspaceInsightSnapshot();
  const { data: inboxSummary, isLoading: inboxLoading } =
    useWorkspaceInsightsInboxSummary();
  const { data: topContent, isLoading: topContentLoading } =
    useWorkspaceInsightsTopContent({ limit: 3, sortBy: "impressions" });

  const heroHighlight = snapshotRecord?.snapshot.narrativeHighlights?.[0];
  const topStreak = useMemo(() => {
    const streaks = snapshotRecord?.snapshot.goals?.map((g) => g.streak ?? 0);
    return streaks && streaks.length > 0 ? Math.max(...streaks) : undefined;
  }, [snapshotRecord?.snapshot.goals]);

  const heroSuggestion = useMemo(() => {
    if (
      !snapshotRecord?.snapshot.goals ||
      snapshotRecord.snapshot.goals.length === 0
    ) {
      return {
        label: "Starter cadence",
        description:
          "Publish three posts this week to unlock personalized targets.",
        ctaLabel: "Set starter goal",
        href: `/workspaces/${workspace.slug}/insights`,
      } as const;
    }

    const primaryGoal = snapshotRecord.snapshot.goals[0];
    const percent = Math.round(
      Math.min(1, Math.max(primaryGoal.progressPercent ?? 0, 0)) * 100,
    );

    return {
      label: "Stay on track",
      description: `You are ${percent}% of the way there. Keep the cadence to protect your streak.`,
      ctaLabel: "Review goals",
      href: `/workspaces/${workspace.slug}/insights`,
    } as const;
  }, [snapshotRecord?.snapshot.goals, workspace.slug]);

  const actionItems = useMemo(
    () =>
      buildActionItems(
        snapshotRecord?.snapshot.goals,
        snapshotRecord?.snapshot.narrativeHighlights,
      ),
    [
      snapshotRecord?.snapshot.goals,
      snapshotRecord?.snapshot.narrativeHighlights,
    ],
  );

  const plannerItems = useMemo(
    () => buildPlannerItems(topContent?.items ?? []),
    [topContent?.items],
  );

  const weeklyPlan = useMemo(
    () => buildWeeklyPlanStats(snapshotRecord?.snapshot.goals),
    [snapshotRecord?.snapshot.goals],
  );

  const primaryGoal = snapshotRecord?.snapshot.goals?.[0];

  return (
    <div className="min-h-screen bg-muted/15">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <HomeHeroCard
            workspaceName={workspace.name}
            workspaceSlug={workspace.slug}
            highlight={heroHighlight}
            streak={topStreak}
            isLoading={snapshotPending}
            suggestion={!snapshotPending ? heroSuggestion : undefined}
          />
          <AccountStatusStrip
            isLoading={snapshotPending || inboxLoading}
            snapshotGoals={snapshotRecord?.snapshot.goals}
            streak={topStreak}
            inboxOpen={inboxSummary?.openMessages}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-8">
            <ToDoListCard
              workspaceSlug={workspace.slug}
              actions={actionItems}
              inboxSummary={{
                totalInboundMessages: inboxSummary?.totalInboundMessages ?? 0,
                openMessages: inboxSummary?.openMessages ?? 0,
              }}
              isLoading={snapshotPending || inboxLoading}
            />

            <PlannerPanel
              goals={snapshotRecord?.snapshot.goals}
              isGoalsLoading={snapshotPending}
              items={plannerItems}
              workspaceSlug={workspace.slug}
            />

            <InsightsSummaryCards
              snapshotRecord={snapshotRecord ?? undefined}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <MomentumCard tone="subtle" className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-medium text-foreground">
                      Posts & reels
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Performance highlights from the last 60 days
                    </p>
                  </div>
                  <Link
                    to="/workspaces/$workspaceSlug/insights"
                    params={{ workspaceSlug: workspace.slug }}
                    className="text-xs text-primary hover:underline"
                  >
                    View all
                  </Link>
                </div>
                {topContentLoading ? (
                  <InsightsTopContentSkeleton rows={3} />
                ) : (
                  <InsightsTopContent
                    items={
                      ((topContent?.items ?? []) as MergedContentEntity[]) ?? []
                    }
                  />
                )}
              </MomentumCard>

              <RecentAdsCard />
            </div>
          </div>

          <div className="space-y-5 xl:col-span-4">
            <WeeklyPlanCard stats={weeklyPlan} />
            <WeeklyGoalCard goal={primaryGoal} workspaceSlug={workspace.slug} />
            <MarketingQuickLinks workspaceSlug={workspace.slug} />
            <EstimatedResultsCard />
          </div>
        </div>
      </div>
    </div>
  );
}

type ActionItem = {
  id: string;
  title: string;
  description: string;
  complete?: boolean;
};

function buildActionItems(
  goals?: InsightGoalSummary[],
  highlights?: { headline: string; body?: string }[],
): ActionItem[] {
  const items: ActionItem[] = [];

  goals?.forEach((goal) => {
    const progress = Math.min(Math.max(goal.progressPercent ?? 0, 0), 1);
    const streak = goal.streak ?? 0;

    if (progress < 0.5) {
      items.push({
        id: `${goal.goalId}-progress`,
        title: "Queue another post",
        description: `You are ${(progress * 100).toFixed(0)}% toward this goal.`,
        complete: progress >= 0.5,
      });
    } else if (streak > 0) {
      items.push({
        id: `${goal.goalId}-streak`,
        title: "Protect your streak",
        description: `Maintain the ${streak} week cadence.`,
        complete: progress >= 1,
      });
    }
  });

  if (!items.length && highlights?.length) {
    items.push({
      id: "highlight",
      title: "Double down on momentum",
      description:
        highlights[0]?.body ??
        "Replicate your recent win by reusing the top performing creative.",
    });
  }

  return items.slice(0, 4);
}

type PlannerItem = {
  id: string;
  title: string;
  platform: string;
  scheduledAt?: Date;
  status: "scheduled" | "published" | "draft";
};

function buildPlannerItems(entities: MergedContentEntity[]): PlannerItem[] {
  const now = Date.now();

  const plannerItems = entities
    .map((entity) =>
      matchEntity<PlannerItem | null>(entity, {
        group: () => null,
        content: ({ entity: content }) => {
          const publishAt = content.placementSpec?.schedulingSpec?.publishAt
            ? new Date(content.placementSpec.schedulingSpec.publishAt)
            : undefined;

          const status =
            publishAt && publishAt.getTime() > now
              ? "scheduled"
              : content.publishingStatus === "DRAFT"
                ? "draft"
                : "published";

          return {
            id: String(content.id),
            title: content.placement.replace("_", " "),
            platform: resolvePlatformLabel(content.placement),
            scheduledAt: publishAt,
            status,
          };
        },
      }),
    )
    .filter((item): item is PlannerItem => Boolean(item));

  return plannerItems
    .sort((a, b) => {
      const aTime = a.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .slice(0, 3);
}

type WeeklyPlanStats = {
  completed: number;
  total: number;
  completionPercent: number;
};

function buildWeeklyPlanStats(goals?: InsightGoalSummary[]): WeeklyPlanStats {
  if (!goals?.length) {
    return {
      completed: 0,
      total: 5,
      completionPercent: 0,
    };
  }

  const normalized = goals.map((goal) =>
    Math.min(Math.max(goal.progressPercent ?? 0, 0), 1),
  );

  const completionPercent =
    normalized.reduce((sum, percent) => sum + percent, 0) / normalized.length;

  const total = goals.length * 2;
  const completed = Math.round(total * completionPercent);

  return {
    completed,
    total,
    completionPercent,
  };
}

function resolvePlatformLabel(placement: string) {
  if (placement.startsWith("FB")) return "Facebook";
  if (placement.startsWith("IG")) return "Instagram";
  if (placement.startsWith("TT")) return "TikTok";
  return "All channels";
}

type AccountStatusStripProps = {
  isLoading: boolean;
  streak?: number;
  snapshotGoals?: InsightGoalSummary[];
  inboxOpen?: number;
};

function AccountStatusStrip({
  isLoading,
  streak,
  snapshotGoals,
  inboxOpen,
}: AccountStatusStripProps) {
  const stats = [
    {
      label: "Active goals",
      value: snapshotGoals?.length ?? 0,
      icon: Target,
    },
    {
      label: "Longest streak",
      value: streak ?? 0,
      icon: Rocket,
    },
    {
      label: "Open inbox items",
      value: inboxOpen ?? 0,
      icon: MailCheck,
    },
  ];

  return (
    <MomentumCard tone="subtle" className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Account status</p>
        <p className="text-xs text-muted-foreground">
          Quick pulse on goals and inbox load
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-border/40 p-4"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Icon className="h-4 w-4" />
                {stat.label}
              </div>
              {isLoading ? (
                <Skeleton className="mt-3 h-6 w-12 rounded" />
              ) : (
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {stat.value}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </MomentumCard>
  );
}

type ToDoListCardProps = {
  workspaceSlug: string;
  actions: ActionItem[];
  inboxSummary: {
    totalInboundMessages: number;
    openMessages: number;
  };
  isLoading: boolean;
};

function ToDoListCard({
  workspaceSlug,
  actions,
  inboxSummary,
  isLoading,
}: ToDoListCardProps) {
  return (
    <MomentumCard className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">To-do list</p>
          <p className="text-xs text-muted-foreground">
            New mentions, scheduling nudges and goal reminders
          </p>
        </div>
        <Link
          to="/workspaces/$workspaceSlug/inbox"
          params={{ workspaceSlug }}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary"
        >
          View inbox
          <MoveRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="rounded-2xl border border-border/40 p-4">
        <div className="flex items-center gap-3 text-sm">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">
              {inboxSummary.openMessages} items need review
            </p>
            <p className="text-xs text-muted-foreground">
              {inboxSummary.totalInboundMessages.toLocaleString()} messages
              received this week
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((idx) => (
            <Skeleton key={idx} className="h-12 w-full rounded-2xl" />
          ))}
        </div>
      ) : actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keep publishing and we&apos;ll surface personalized suggestions.
        </p>
      ) : (
        <ul className="space-y-3">
          {actions.map((action) => (
            <li
              key={action.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-border/40 p-4",
                action.complete ? "bg-muted/50" : "",
              )}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/50">
                {action.complete ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <CircleCheckBig className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {action.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </MomentumCard>
  );
}

type PlannerPanelProps = {
  goals?: InsightGoalSummary[];
  isGoalsLoading: boolean;
  items: PlannerItem[];
  workspaceSlug: string;
};

function PlannerPanel({
  goals,
  isGoalsLoading,
  items,
  workspaceSlug,
}: PlannerPanelProps) {
  return (
    <MomentumCard className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Planner</p>
          <p className="text-xs text-muted-foreground">
            Track weekly cadence and upcoming scheduled content
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/workspaces/$workspaceSlug/calendar"
            params={{ workspaceSlug }}
            search={{ view: "week" }}
            className="text-xs text-primary hover:underline"
          >
            Calendar
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            to="/workspaces/$workspaceSlug/composer"
            params={{ workspaceSlug }}
            className="text-xs text-primary hover:underline"
          >
            Create post
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <PlannerGoalList goals={goals} isLoading={isGoalsLoading} />
        <UpcomingScheduleList items={items} />
      </div>
    </MomentumCard>
  );
}

type PlannerGoalListProps = {
  goals?: InsightGoalSummary[];
  isLoading: boolean;
};

function PlannerGoalList({ goals, isLoading }: PlannerGoalListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 rounded-2xl border border-border/40 p-4">
        {[0, 1, 2].map((idx) => (
          <div key={idx} className="space-y-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-2.5 w-full rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!goals?.length) {
    return (
      <div className="flex h-full flex-col justify-center gap-1 rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
        <span>No goals yet.</span>
        <span>Set a cadence to unlock personalized planning.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/40 p-4">
      {goals.map((goal) => {
        const percent = Math.min(Math.max(goal.progressPercent ?? 0, 0), 1);
        return (
          <div key={goal.goalId}>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="uppercase tracking-wide">{goal.status}</span>
              {goal.streak ? (
                <span className="text-emerald-500">
                  {goal.streak} wk streak
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-foreground">
                {(percent * 100).toFixed(0)}%
              </span>
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${percent * 100}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type UpcomingScheduleListProps = {
  items: PlannerItem[];
};

function UpcomingScheduleList({ items }: UpcomingScheduleListProps) {
  if (!items.length) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
        <span>No scheduled posts.</span>
        <span>Use the composer to queue your next campaign.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/40 p-4">
      {items.map((item) => (
        <div key={item.id} className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="uppercase tracking-wide">{item.platform}</span>
            <span className="text-[11px] font-medium text-primary">
              {item.status === "scheduled" ? "Scheduled" : item.status}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          <p className="text-xs text-muted-foreground">
            {item.scheduledAt
              ? format(item.scheduledAt, "MMM d • h:mm a")
              : "Publish date to be scheduled"}
          </p>
        </div>
      ))}
    </div>
  );
}

type WeeklyPlanCardProps = {
  stats: WeeklyPlanStats;
};

function WeeklyPlanCard({ stats }: WeeklyPlanCardProps) {
  const remaining = Math.max(stats.total - stats.completed, 0);

  return (
    <MomentumCard className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Weekly plan</p>
        <p className="text-xs text-muted-foreground">
          Complete at least 5 tasks to finish this plan
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
            <path
              d="M18 2.0845
               a 15.9155 15.9155 0 0 1 0 31.831
               a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted"
            />
            <path
              d="M18 2.0845
               a 15.9155 15.9155 0 0 1 0 31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${stats.completionPercent * 100}, 100`}
              className="text-primary"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-lg font-semibold text-foreground">
              {(stats.completionPercent * 100).toFixed(0)}%
            </span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Complete
            </span>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {stats.completed} of {stats.total} tasks completed
          </p>
          <p className="text-sm text-muted-foreground">
            {remaining} tasks remaining
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-border/40 p-4 text-sm text-muted-foreground">
        Set your business up for success by completing recommended tasks.
      </div>
    </MomentumCard>
  );
}

type WeeklyGoalCardProps = {
  goal?: InsightGoalSummary;
  workspaceSlug: string;
};

function WeeklyGoalCard({ goal, workspaceSlug }: WeeklyGoalCardProps) {
  const percent = Math.min(Math.max(goal?.progressPercent ?? 0, 0), 1);

  return (
    <MomentumCard className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">Weekly goal</p>
          <p className="text-xs text-muted-foreground">
            Stay on track to protect your streak
          </p>
        </div>
      </div>
      {goal ? (
        <>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-semibold text-foreground">
              {(percent * 100).toFixed(0)}%
            </p>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Progress
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${percent * 100}%` }}
            />
          </div>
          {goal.streak ? (
            <p className="text-xs text-muted-foreground">
              {goal.streak} week streak active
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Create a cadence goal to unlock personalized tracking.
        </p>
      )}
      <Link
        to="/workspaces/$workspaceSlug/insights"
        params={{ workspaceSlug }}
        className="inline-flex items-center gap-2 text-xs font-medium text-primary"
      >
        Review goals
        <MoveRight className="h-3.5 w-3.5" />
      </Link>
    </MomentumCard>
  );
}

type MarketingQuickLinksProps = {
  workspaceSlug: string;
};

function MarketingQuickLinks({ workspaceSlug }: MarketingQuickLinksProps) {
  return (
    <MomentumCard className="space-y-4">
      <div className="flex items-center gap-2">
        <Rocket className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Manage your marketing content
          </p>
          <p className="text-xs text-muted-foreground">
            Quick access to the tools you use most
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <Link
          to="/workspaces/$workspaceSlug/composer"
          params={{ workspaceSlug }}
          className="flex items-center justify-between rounded-2xl border border-border/40 p-4 text-left hover:bg-muted/40"
        >
          <div>
            <p className="text-sm font-medium text-foreground">Composer</p>
            <p className="text-xs text-muted-foreground">
              Draft posts, stories and reels
            </p>
          </div>
          <MoveRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/workspaces/$workspaceSlug/calendar"
          params={{ workspaceSlug }}
          search={{ view: "week" }}
          className="flex items-center justify-between rounded-2xl border border-border/40 p-4 text-left hover:bg-muted/40"
        >
          <div>
            <p className="text-sm font-medium text-foreground">Calendar</p>
            <p className="text-xs text-muted-foreground">
              Visualize your schedule
            </p>
          </div>
          <MoveRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          to="/workspaces/$workspaceSlug/content"
          params={{ workspaceSlug }}
          className="flex items-center justify-between rounded-2xl border border-border/40 p-4 text-left hover:bg-muted/40"
        >
          <div>
            <p className="text-sm font-medium text-foreground">
              Content library
            </p>
            <p className="text-xs text-muted-foreground">
              Manage assets and approvals
            </p>
          </div>
          <MoveRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </MomentumCard>
  );
}

function EstimatedResultsCard() {
  return (
    <MomentumCard className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Estimated results
          </p>
          <p className="text-xs text-muted-foreground">
            Projected performance for your next boost
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-border/40 p-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Daily budget</span>
          <span>$25</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-muted">
          <div className="h-full w-2/3 rounded-full bg-primary" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Increase your budget to reach more people in the next 7 days.
        </p>
      </div>
      <div className="rounded-2xl border border-border/40 p-4 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Estimated reach</span>
          <span>1.7K - 5K</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>Estimated replies</span>
          <span>15 - 42</span>
        </div>
      </div>
    </MomentumCard>
  );
}

function RecentAdsCard() {
  const ads = [
    {
      id: "recent-1",
      title: "Boosted Instagram media",
      goal: "Get more website visitors",
      completedAt: "Completed on Oct 21",
    },
    {
      id: "recent-2",
      title: "Post engagements",
      goal: "Post Engagements",
      completedAt: "Completed on Nov 5",
    },
  ];

  return (
    <MomentumCard className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Recent ads</p>
          <p className="text-xs text-muted-foreground">
            Performance from the last 60 days
          </p>
        </div>
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-3">
        {ads.map((ad) => (
          <div
            key={ad.id}
            className="rounded-2xl border border-border/40 p-4 text-sm"
          >
            <p className="font-medium text-foreground">{ad.title}</p>
            <p className="text-xs text-muted-foreground">{ad.completedAt}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              Goal: {ad.goal}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Ads created in the last 60 days will appear here.
      </p>
    </MomentumCard>
  );
}
