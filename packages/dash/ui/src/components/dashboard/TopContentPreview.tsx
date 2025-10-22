import { Card } from "@openpromo/ui/components/card";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import type { MergedContentEntity } from "@worker/routes/api/workspaces/content";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { type ConnectedAccount, matchEntity } from "@/lib/hono-client";

type TopContentPreviewProps = {
  items?: MergedContentEntity[];
  accounts: ConnectedAccount[];
  isLoading?: boolean;
  workspaceSlug: string;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatNumber(value: number | null | undefined) {
  if (!value) return "0";
  return numberFormatter.format(value);
}

function resolveAccountName(
  connectedAccountId: string | null | undefined,
  accounts: ConnectedAccount[],
) {
  if (!connectedAccountId) return "";
  const account = accounts.find((acc) => acc.id === connectedAccountId);
  return account?.accountName ?? "";
}

export function TopContentPreview({
  items,
  accounts,
  isLoading,
  workspaceSlug,
}: TopContentPreviewProps) {
  if (isLoading) {
    return (
      <Card className="border-border/30 p-4 shadow-none">
        <Skeleton className="h-4 w-32" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: ok
            <div key={index} className="flex items-start gap-2.5">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const visibleItems = items?.slice(0, 3) ?? [];

  return (
    <Card className="border-border/30 p-4 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Top content</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ranking by impressions over the past week.
          </p>
        </div>
        <Link
          to="/workspaces/$workspaceSlug/insights"
          params={{ workspaceSlug }}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline whitespace-nowrap"
        >
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {visibleItems.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground">
          Publish or schedule posts to see performance insights here.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {visibleItems.map((item) =>
            matchEntity(item, {
              content: ({ entity }) => {
                const impressions = entity.metrics?.impressions ?? 0;
                const engagement = entity.metrics?.engagement ?? 0;
                const accountName = resolveAccountName(
                  entity.connectedAccountId,
                  accounts,
                );
                const refreshedAt = entity.metricsRefreshedAt
                  ? formatDistanceToNow(new Date(entity.metricsRefreshedAt), {
                      addSuffix: true,
                    })
                  : "Never";
                let labelFromLink: string | undefined;
                if (entity.permalinkUrl) {
                  try {
                    labelFromLink = new URL(entity.permalinkUrl).hostname;
                  } catch {
                    labelFromLink = entity.permalinkUrl;
                  }
                }
                const title =
                  accountName || labelFromLink || `Post ${entity.id.slice(-6)}`;

                return (
                  <div
                    key={entity.id}
                    className="flex items-start gap-2.5 rounded-lg border border-border/30 p-2.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-semibold shrink-0">
                      {entity.placement.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">
                          {title}
                        </p>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {entity.placement}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70">
                        Refreshed {refreshedAt}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground/70">
                        Impressions
                      </p>
                      <p className="text-base font-semibold text-foreground tabular-nums">
                        {formatNumber(impressions)}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">
                        Engagement {formatNumber(engagement)}
                      </p>
                    </div>
                  </div>
                );
              },
              group: ({ contents, entity }) => (
                <div
                  key={entity.id}
                  className="flex items-center justify-between rounded-lg border border-border/30 p-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Campaign group
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">
                      {contents.length} placements
                    </p>
                  </div>
                  <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              ),
            }),
          )}
        </div>
      )}
    </Card>
  );
}
