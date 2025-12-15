import { Button } from "@openpromo/ui/components/button";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/shared/content-types";
import { format } from "date-fns";
import { MoveRight } from "lucide-react";
import { useMemo } from "react";
import {
  RiAddLine,
  RiBarChartBoxLine,
  RiCalendarScheduleLine,
} from "react-icons/ri";
import { ContentPlannerCard } from "@/components/home/content-planner-card";
import { DraftsStrip } from "@/components/home/drafts-strip";
import { QuickStatsCard } from "@/components/home/quick-stats-card";
import { ToDoListCard } from "@/components/home/todo-list-card";
import { WeeklyProgressCard } from "@/components/home/weekly-progress-card";
import {
  InsightsTopContent,
  InsightsTopContentSkeleton,
} from "@/components/insights/InsightsTopContent";
import { MomentumCard } from "@/components/momentum/MomentumCard";
import { QuickAdCard } from "@/components/quick-ad/quick-ad-card";
import { useWorkspace } from "@/hooks/useWorkspace";
import { matchEntity } from "@/lib/hono-client";
import { useDraftsQuery } from "@/queries/content-orpc";
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

  // Queries
  const { data: snapshotRecord, isPending: snapshotPending } =
    useWorkspaceInsightSnapshot();
  const { data: inboxSummary, isPending: inboxLoading } =
    useWorkspaceInsightsInboxSummary();
  const { data: topContent, isPending: topContentLoading } =
    useWorkspaceInsightsTopContent({ limit: 8, sortBy: "impressions" });
  const { data: draftsData, isPending: draftsLoading } = useDraftsQuery(4);

  // Derived data
  const cadenceSummary = snapshotRecord?.snapshot.cadenceSummary;
  const reachMomentum = snapshotRecord?.snapshot.reachMomentum;
  const primaryGoal = snapshotRecord?.snapshot.goals?.[0];

  const drafts = useMemo(
    () => (draftsData?.entities ?? []) as MergedContentEntity[],
    [draftsData?.entities],
  );

  const draftsCount = draftsData?.pagination.total ?? 0;

  const { recentContent, scheduledContent } = useMemo(() => {
    const entities = (topContent?.items ?? []) as MergedContentEntity[];
    const now = Date.now();

    const recent: MergedContentEntity[] = [];
    const scheduled: MergedContentEntity[] = [];

    for (const item of entities) {
      matchEntity(item, {
        group: ({ entity }) => {
          const publishAt =
            entity.pendingContentGroupSpec?.baseSchedulingSpec?.publishAt;
          if (publishAt && new Date(publishAt).getTime() > now) {
            scheduled.push(item);
          } else {
            recent.push(item);
          }
        },
        content: ({ entity }) => {
          const publishAt = entity.placementSpec?.schedulingSpec?.publishAt;
          if (publishAt && new Date(publishAt).getTime() > now) {
            scheduled.push(item);
          } else {
            recent.push(item);
          }
        },
      });
    }

    return { recentContent: recent, scheduledContent: scheduled };
  }, [topContent?.items]);

  const plannerItems = useMemo(
    () => buildPlannerItems((topContent?.items ?? []) as MergedContentEntity[]),
    [topContent?.items],
  );

  return (
    <div className="min-h-screen bg-muted/15">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <WorkspaceActionBar workspaceSlug={workspace.slug} />

        <div className="grid gap-6 xl:grid-cols-12">
          {/* Main Column (8/12) */}
          <div className="space-y-6 xl:col-span-8">
            {/* Hero: Instant Ad */}
            <QuickAdCard />

            {/* To-Do List */}
            <ToDoListCard
              workspaceSlug={workspace.slug}
              openMessages={inboxSummary?.openMessages ?? 0}
              draftsCount={draftsCount}
              isLoading={inboxLoading || draftsLoading}
            />

            {/* Drafts Strip (only if has drafts) */}
            <DraftsStrip
              workspaceSlug={workspace.slug}
              drafts={drafts}
              isLoading={draftsLoading}
            />

            {/* Weekly Progress (Plan + Goal combined) */}
            <WeeklyProgressCard
              workspaceSlug={workspace.slug}
              cadenceSummary={cadenceSummary}
              primaryGoal={primaryGoal}
              isLoading={snapshotPending}
            />

            {/* Content Planner */}
            <ContentPlannerCard
              workspaceSlug={workspace.slug}
              recentContent={recentContent}
              scheduledContent={scheduledContent}
              isLoading={topContentLoading}
            />
          </div>

          {/* Sidebar (4/12) */}
          <div className="space-y-6 xl:col-span-4">
            {/* Upcoming Schedule */}
            <UpcomingScheduleCard
              items={plannerItems}
              isLoading={topContentLoading}
              workspaceSlug={workspace.slug}
            />

            {/* Top Performers */}
            <TopContentCard
              isLoading={topContentLoading}
              items={(topContent?.items ?? []) as MergedContentEntity[]}
              workspaceSlug={workspace.slug}
            />

            {/* Quick Stats */}
            <QuickStatsCard
              workspaceSlug={workspace.slug}
              reachMomentum={reachMomentum}
              isLoading={snapshotPending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Bar
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Planner Items Helper
// ─────────────────────────────────────────────────────────────────────────────

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

function resolvePlatformLabel(placement: string) {
  if (placement.startsWith("FB")) return "Facebook";
  if (placement.startsWith("IG")) return "Instagram";
  if (placement.startsWith("TT")) return "TikTok";
  return "All channels";
}

// ─────────────────────────────────────────────────────────────────────────────
// Upcoming Schedule Card (Sidebar)
// ─────────────────────────────────────────────────────────────────────────────

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
        <p className="text-sm font-medium text-foreground">Upcoming</p>
        <Link
          to="/workspaces/$workspaceSlug/calendar"
          params={{ workspaceSlug }}
          search={{ view: "week" }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Open calendar
        </Link>
      </div>
      {isLoading ? (
        <UpcomingScheduleSkeleton />
      ) : (
        <UpcomingScheduleList items={items} workspaceSlug={workspaceSlug} />
      )}
      <Button asChild variant="outline" size="sm" className="w-full">
        <Link
          to="/workspaces/$workspaceSlug/composer"
          params={{ workspaceSlug }}
        >
          Create post
        </Link>
      </Button>
    </MomentumCard>
  );
}

function UpcomingScheduleSkeleton() {
  return (
    <div className="space-y-4 border-l-2 border-border/40 pl-4 ml-1">
      {[0, 1, 2].map((idx) => (
        <div key={idx} className="relative">
          <div className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 border-border bg-background" />
          <Skeleton className="h-3 w-20 mb-2" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type UpcomingScheduleListProps = {
  items: PlannerItem[];
  workspaceSlug: string;
};

function UpcomingScheduleList({
  items,
  workspaceSlug,
}: UpcomingScheduleListProps) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-4 text-center">
        <p className="text-sm text-muted-foreground mb-1">
          Nothing scheduled yet
        </p>
        <Link
          to="/workspaces/$workspaceSlug/composer"
          params={{ workspaceSlug }}
          className="text-xs text-primary hover:underline"
        >
          Create your first post
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-l-2 border-border/40 pl-4 ml-1">
      {items.map((item, index) => {
        const isScheduled = item.status === "scheduled";
        const isLast = index === items.length - 1;

        return (
          <div key={item.id} className="relative">
            {/* Timeline dot */}
            <div
              className={`absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 ${
                isScheduled
                  ? "border-foreground bg-foreground"
                  : "border-border bg-background"
              }`}
            />

            {/* Date/time label */}
            <p className="text-xs text-muted-foreground mb-2">
              {item.scheduledAt
                ? format(item.scheduledAt, "MMM d, h:mm a")
                : "Not scheduled"}
            </p>

            {/* Content row */}
            <div className={`flex gap-3 ${!isLast ? "pb-1" : ""}`}>
              {/* Thumbnail placeholder */}
              <div className="h-10 w-10 rounded-lg bg-muted/40 flex items-center justify-center shrink-0 overflow-hidden">
                <span className="text-[10px] text-muted-foreground">
                  {item.platform.slice(0, 2)}
                </span>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{item.platform}</p>
                <p className="text-sm text-foreground truncate">{item.title}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top Content Card (Sidebar)
// ─────────────────────────────────────────────────────────────────────────────

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
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
          <MoveRight className="h-3 w-3" />
        </Link>
      </div>
      {isLoading ? (
        <InsightsTopContentSkeleton rows={3} />
      ) : (
        <InsightsTopContent items={items.slice(0, 3)} />
      )}
    </MomentumCard>
  );
}
