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
