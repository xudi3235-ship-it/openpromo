import { Button } from "@openpromo/ui/components/button";
import type {
  InsightsStatus,
  WorkspaceInsightsSummaryResponse,
} from "@shared/insights";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { startOfDay, subDays } from "date-fns";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { InboxSnapshot } from "@/components/dashboard/InboxSnapshot";
import { TopContentPreview } from "@/components/dashboard/TopContentPreview";
import { WorkspaceHighlights } from "@/components/dashboard/WorkspaceHighlights";
import { WorkspaceLoading } from "@/components/loading/workspace-loading";
import { StylesInfiniteGrid } from "@/components/styles/styles-infinite-grid";
import {
  prefetchConnectedAccounts,
  useConnectedAccounts,
} from "@/queries/connected-account";
import {
  prefetchWorkspaceInsightsInboxSummary,
  prefetchWorkspaceInsightsStatus,
  prefetchWorkspaceInsightsSummary,
  prefetchWorkspaceInsightsTopContent,
  useWorkspaceInsightsInboxSummary,
  useWorkspaceInsightsStatus,
  useWorkspaceInsightsSummary,
  useWorkspaceInsightsTopContent,
} from "@/queries/insights";

const TOP_CONTENT_LIMIT = 3;
const TOP_CONTENT_WINDOW_DAYS = 7;

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/",
)({
  loader: ({ params, context }) => {
    prefetchConnectedAccounts(context.queryClient, params.workspaceSlug);
    prefetchWorkspaceInsightsSummary(context.queryClient, params.workspaceSlug);
    prefetchWorkspaceInsightsStatus(context.queryClient, params.workspaceSlug);
    prefetchWorkspaceInsightsInboxSummary(
      context.queryClient,
      params.workspaceSlug,
    );
    const end = startOfDay(new Date());
    const start = subDays(end, TOP_CONTENT_WINDOW_DAYS);
    prefetchWorkspaceInsightsTopContent(
      context.queryClient,
      params.workspaceSlug,
      {
        limit: TOP_CONTENT_LIMIT,
        start,
        end,
      },
    );
  },
  component: WorkspaceIndex,
  pendingComponent: WorkspaceLoading,
});

function WorkspaceIndex() {
  const { workspaceSlug } = Route.useParams();
  const { accounts, isLoading: accountsLoading } = useConnectedAccounts();
  const { data: summary, isLoading: summaryLoading } =
    useWorkspaceInsightsSummary();
  const { data: status, isLoading: statusLoading } =
    useWorkspaceInsightsStatus();
  const { data: inboxSummary, isLoading: inboxLoading } =
    useWorkspaceInsightsInboxSummary();

  const topContentRange = useMemo(() => {
    const end = startOfDay(new Date());
    const start = subDays(end, TOP_CONTENT_WINDOW_DAYS);
    return { start, end } as const;
  }, []);

  const { data: topContent, isLoading: topContentLoading } =
    useWorkspaceInsightsTopContent({
      limit: TOP_CONTENT_LIMIT,
      start: topContentRange.start,
      end: topContentRange.end,
    });

  const totalFollowers = useMemo(
    () =>
      accounts.reduce((sum, account) => sum + (account.followersCount ?? 0), 0),
    [accounts],
  );

  const normalizedSummary = useMemo<
    WorkspaceInsightsSummaryResponse | undefined
  >(() => {
    if (!summary) return undefined;
    return {
      ...summary,
      lastRefreshedAt: summary.lastRefreshedAt
        ? new Date(summary.lastRefreshedAt)
        : null,
    } as WorkspaceInsightsSummaryResponse;
  }, [summary]);

  const normalizedStatus = useMemo<InsightsStatus | undefined>(() => {
    if (!status) return undefined;
    return {
      ...status,
      contentLastRefreshedAt: status.contentLastRefreshedAt
        ? new Date(status.contentLastRefreshedAt)
        : null,
      followerLastCollectedAt: status.followerLastCollectedAt
        ? new Date(status.followerLastCollectedAt)
        : null,
      inboxLastUpdatedAt: status.inboxLastUpdatedAt
        ? new Date(status.inboxLastUpdatedAt)
        : null,
    } as InsightsStatus;
  }, [status]);

  const isPageLoading =
    accountsLoading || summaryLoading || statusLoading || inboxLoading;

  if (isPageLoading && !summary && !status) {
    return <WorkspaceLoading />;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Welcome back
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Here&rsquo;s a snapshot of your workspace performance.
            </p>
          </div>
          <Button asChild size="default" className="gap-2">
            <Link
              to="/workspaces/$workspaceSlug/composer"
              params={{ workspaceSlug }}
            >
              <Plus className="h-4 w-4" />
              Create Post
            </Link>
          </Button>
        </header>

        <WorkspaceHighlights
          summary={normalizedSummary}
          status={normalizedStatus}
          totalFollowers={totalFollowers}
          isLoading={isPageLoading}
        />

        <section className="grid gap-3 lg:grid-cols-2">
          <InboxSnapshot summary={inboxSummary} isLoading={inboxLoading} />
          <TopContentPreview
            items={topContent?.items as MergedContentEntity[] | undefined}
            isLoading={topContentLoading}
            workspaceSlug={workspaceSlug}
          />
        </section>

        <section className="bg-card rounded-lg border border-border/30 p-4 shadow-none">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Explore Creative Styles
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Discover reusable visual systems to accelerate your next
                campaign.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="self-start sm:self-auto shrink-0"
            >
              <Link
                to="/workspaces/$workspaceSlug/styles"
                params={{ workspaceSlug }}
              >
                View marketplace
              </Link>
            </Button>
          </div>

          <div className="mt-3">
            <StylesInfiniteGrid
              className="gap-2"
              gridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
