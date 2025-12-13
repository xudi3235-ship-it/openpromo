import { Button } from "@openpromo/ui/components/button";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { cn } from "@openpromo/ui/lib/utils";
import type {
  AiMediaImpact,
  CadenceSummary,
  InsightGoalSummary,
  ReachMomentum,
} from "@shared/insights";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { format } from "date-fns";
import {
  BarChart3,
  CheckCircle2,
  CircleCheckBig,
  ListChecks,
  MailCheck,
  MoveRight,
  Rocket,
  Target,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { useMemo } from "react";
import {
  RiAddLine,
  RiBarChartBoxLine,
  RiCalendarScheduleLine,
} from "react-icons/ri";
import { CompactStatsCard } from "@/components/home/compact-stats-card";
import { InsightsSummaryCards } from "@/components/insights/InsightsSummaryCards";
import {
  InsightsTopContent,
  InsightsTopContentSkeleton,
} from "@/components/insights/InsightsTopContent";
import { MomentumCard } from "@/components/momentum/MomentumCard";
import { QuickAdCard } from "@/components/quick-ad/quick-ad-card";
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
  const { data: inboxSummary, isPending: inboxLoading } =
    useWorkspaceInsightsInboxSummary();
  const { data: topContent, isPending: topContentLoading } =
    useWorkspaceInsightsTopContent({ limit: 3, sortBy: "impressions" });

  const topStreak = useMemo(() => {
    const streaks = snapshotRecord?.snapshot.goals?.map((g) => g.streak ?? 0);
    return streaks && streaks.length > 0 ? Math.max(...streaks) : undefined;
  }, [snapshotRecord?.snapshot.goals]);

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
  const cadenceSummary = snapshotRecord?.snapshot.cadenceSummary;
  const reachMomentum = snapshotRecord?.snapshot.reachMomentum;
  const aiMediaImpact = snapshotRecord?.snapshot.aiMediaImpact;

  return (
    <div className="min-h-screen bg-muted/15">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <WorkspaceActionBar workspaceSlug={workspace.slug} />
        <div className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <QuickAdCard />

            <CompactStatsCard
              cadenceSummary={cadenceSummary}
              workspaceSlug={workspace.slug}
              isLoading={snapshotPending}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <CadenceScoreCard
                summary={cadenceSummary}
                isLoading={snapshotPending}
                workspaceSlug={workspace.slug}
              />
              <ReachMomentumCard
                summary={reachMomentum}
                isLoading={snapshotPending}
                workspaceSlug={workspace.slug}
              />
              <AiMediaImpactCard
                summary={aiMediaImpact}
                isLoading={snapshotPending}
                workspaceSlug={workspace.slug}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <WeeklyPlanCard stats={weeklyPlan} />
              <WeeklyGoalCard
                goal={primaryGoal}
                workspaceSlug={workspace.slug}
              />
            </div>

            <ToDoListCard
              workspaceSlug={workspace.slug}
              actions={actionItems}
              inboxSummary={{
                totalInboundMessages: inboxSummary?.totalInboundMessages ?? 0,
                openMessages: inboxSummary?.openMessages ?? 0,
              }}
              isLoading={snapshotPending || inboxLoading}
            />

            <InsightsSummaryCards
              snapshotRecord={snapshotRecord ?? undefined}
            />
          </div>

          <div className="space-y-6 xl:col-span-4">
            <AccountStatusStrip
              isLoading={snapshotPending || inboxLoading}
              snapshotGoals={snapshotRecord?.snapshot.goals}
              streak={topStreak}
              inboxOpen={inboxSummary?.openMessages}
            />
            <UpcomingScheduleCard
              items={plannerItems}
              isLoading={topContentLoading}
              workspaceSlug={workspace.slug}
            />
            <TopContentCard
              isLoading={topContentLoading}
              items={((topContent?.items ?? []) as MergedContentEntity[]) ?? []}
              workspaceSlug={workspace.slug}
            />
            <MarketingQuickLinks workspaceSlug={workspace.slug} />
          </div>
        </div>
      </div>
    </div>
  );
}

type WorkspaceActionBarProps = {
  workspaceSlug: string;
};

function WorkspaceActionBar({ workspaceSlug }: WorkspaceActionBarProps) {
  return (
    <div className="sticky top-0 z-30 border border-border/60 bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:rounded-2xl">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-start">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link
              to="/workspaces/$workspaceSlug/composer"
              params={{ workspaceSlug }}
            >
              <RiAddLine className="h-4 w-4" />
              Create post
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link
              to="/workspaces/$workspaceSlug/calendar"
              params={{ workspaceSlug }}
              search={{ view: "week" }}
            >
              <RiCalendarScheduleLine className="h-4 w-4" />
              Plan calendar
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link
              to="/workspaces/$workspaceSlug/insights"
              params={{ workspaceSlug }}
            >
              <RiBarChartBoxLine className="h-4 w-4" />
              View insights
            </Link>
          </Button>
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

type UpcomingScheduleCardProps = {
  items: PlannerItem[];
  isLoading: boolean;
  workspaceSlug: string;
};

function UpcomingScheduleCard({
  items,
  isLoading,
  workspaceSlug,
}: UpcomingScheduleCardProps) {
  return (
    <MomentumCard className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Upcoming schedule
          </p>
          <p className="text-xs text-muted-foreground">
            Review what&#39;s queued next
          </p>
        </div>
        <Link
          to="/workspaces/$workspaceSlug/calendar"
          params={{ workspaceSlug }}
          search={{ view: "week" }}
          className="text-xs text-primary hover:underline"
        >
          Open calendar
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="space-y-2 rounded-2xl border border-border/40 p-4"
            >
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-4 w-48 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <UpcomingScheduleList items={items} />
      )}
      <Button asChild variant="outline" size="sm">
        <Link
          to="/workspaces/$workspaceSlug/composer"
          params={{ workspaceSlug }}
        >
          Queue another post
        </Link>
      </Button>
    </MomentumCard>
  );
}

type CadenceScoreCardProps = {
  summary?: CadenceSummary;
  workspaceSlug: string;
  isLoading: boolean;
};

function CadenceScoreCard({
  summary,
  workspaceSlug,
  isLoading,
}: CadenceScoreCardProps) {
  if (isLoading) {
    return (
      <MomentumCard className="space-y-3">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-2 w-full rounded" />
      </MomentumCard>
    );
  }

  if (!summary) {
    return (
      <MomentumCard className="space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          Cadence score
        </div>
        <p className="text-sm text-muted-foreground">
          Set a cadence goal to start tracking weekly progress.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link
            to="/workspaces/$workspaceSlug/insights"
            params={{ workspaceSlug }}
          >
            Create goal
          </Link>
        </Button>
      </MomentumCard>
    );
  }

  const remaining = Math.max(summary.targetPosts - summary.completedPosts, 0);

  return (
    <MomentumCard className="space-y-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <BarChart3 className="h-4 w-4" />
        Cadence score
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-foreground">
          {summary.completedPosts}/{summary.targetPosts}
        </span>
        <span className="text-sm text-muted-foreground">posts this week</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${Math.round(summary.progressPercent * 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{remaining ? `${remaining} to stay on track` : "Goal met"}</span>
        <Link
          to="/workspaces/$workspaceSlug/composer"
          params={{ workspaceSlug }}
          className="text-primary"
        >
          Queue a post
        </Link>
      </div>
    </MomentumCard>
  );
}

type ReachMomentumCardProps = {
  summary?: ReachMomentum;
  workspaceSlug: string;
  isLoading: boolean;
};

function ReachMomentumCard({
  summary,
  workspaceSlug,
  isLoading,
}: ReachMomentumCardProps) {
  if (isLoading) {
    return (
      <MomentumCard className="space-y-3">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-6 w-24 rounded" />
      </MomentumCard>
    );
  }

  if (!summary) {
    return (
      <MomentumCard className="space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          Reach momentum
        </div>
        <p className="text-sm text-muted-foreground">
          Publish and connect channels to see reach trends.
        </p>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link
            to="/workspaces/$workspaceSlug/insights"
            params={{ workspaceSlug }}
          >
            View insights
          </Link>
        </Button>
      </MomentumCard>
    );
  }

  const reachValue = summary.reach ?? 0;
  const formattedReach = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(reachValue);

  const hasDelta = typeof summary.deltaPercent === "number";
  const deltaPercent = summary.deltaPercent ?? 0;
  const deltaLabel = hasDelta
    ? `${deltaPercent >= 0 ? "▲" : "▼"} ${Math.abs(
        Math.round(deltaPercent * 100),
      )}% vs last week`
    : "No change yet";
  const deltaClass = deltaPercent >= 0 ? "text-emerald-500" : "text-rose-500";

  return (
    <MomentumCard className="space-y-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <TrendingUp className="h-4 w-4" />
        Reach momentum
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-foreground">
          {formattedReach}
        </span>
        <span className="text-sm text-muted-foreground">accounts reached</span>
      </div>
      <div
        className={cn(
          "text-xs font-medium",
          hasDelta ? deltaClass : "text-muted-foreground",
        )}
      >
        {deltaLabel}
      </div>
      <Button asChild variant="outline" size="sm" className="w-full">
        <Link
          to="/workspaces/$workspaceSlug/insights"
          params={{ workspaceSlug }}
        >
          Review insights
        </Link>
      </Button>
    </MomentumCard>
  );
}

type AiMediaImpactCardProps = {
  summary?: AiMediaImpact;
  workspaceSlug: string;
  isLoading: boolean;
};

function AiMediaImpactCard({
  summary,
  workspaceSlug,
  isLoading,
}: AiMediaImpactCardProps) {
  if (isLoading) {
    return (
      <MomentumCard className="space-y-4">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-8 w-16 rounded" />
        <Skeleton className="h-16 w-full rounded" />
      </MomentumCard>
    );
  }

  if (!summary || summary.generatedPosts === 0) {
    return (
      <MomentumCard className="space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Wand2 className="h-4 w-4" />
          AI media impact
        </div>
        <p className="text-sm text-muted-foreground">
          Generate your next product visual to track AI lift.
        </p>
        <Button asChild size="sm" className="w-full">
          <Link
            to="/workspaces/$workspaceSlug/content"
            params={{ workspaceSlug }}
          >
            Open AI studio
          </Link>
        </Button>
      </MomentumCard>
    );
  }

  return (
    <MomentumCard className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Wand2 className="h-4 w-4" />
        AI media impact
      </div>
      <div>
        <p className="text-3xl font-semibold text-foreground">
          {summary.generatedPosts}
        </p>
        <p className="text-sm text-muted-foreground">
          AI-generated visuals published
        </p>
      </div>
      <div className="rounded-2xl border border-border/40 p-3 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Engagement lift vs manual</span>
          <span className="text-emerald-500 font-medium">
            +{Math.round(summary.engagementLiftPercent * 100)}%
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span>Hours saved</span>
          <span>~{summary.hoursSaved} hrs</span>
        </div>
      </div>
      <Button asChild size="sm" className="w-full">
        <Link
          to="/workspaces/$workspaceSlug/content"
          params={{ workspaceSlug }}
        >
          Open AI studio
        </Link>
      </Button>
    </MomentumCard>
  );
}

type WeeklyPlanCardProps = {
  stats: WeeklyPlanStats;
};

function WeeklyPlanCard({ stats }: WeeklyPlanCardProps) {
  const remaining = Math.max(stats.total - stats.completed, 0);
  const completionPercent = Math.round(stats.completionPercent * 100);
  const ringAngle = (completionPercent / 100) * 360;

  return (
    <MomentumCard className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Weekly plan</p>
        <p className="text-xs text-muted-foreground">
          Complete at least 5 tasks to finish this plan
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24">
          <div
            className="h-full w-full rounded-full"
            style={{
              background: `conic-gradient(hsl(var(--primary)) ${ringAngle}deg, hsl(var(--muted)) ${ringAngle}deg 360deg)`,
            }}
          />
          <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-background text-center">
            <span className="text-2xl font-semibold text-foreground">
              {completionPercent}%
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

type TopContentCardProps = {
  items: MergedContentEntity[];
  isLoading: boolean;
  workspaceSlug: string;
};

function TopContentCard({
  items,
  isLoading,
  workspaceSlug,
}: TopContentCardProps) {
  return (
    <MomentumCard tone="subtle" className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Top content momentum
          </p>
          <p className="text-xs text-muted-foreground">
            Highlights from the last 60 days
          </p>
        </div>
        <Link
          to="/workspaces/$workspaceSlug/insights"
          params={{ workspaceSlug }}
          className="text-xs text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {isLoading ? (
        <InsightsTopContentSkeleton rows={3} />
      ) : (
        <InsightsTopContent items={items} />
      )}
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
