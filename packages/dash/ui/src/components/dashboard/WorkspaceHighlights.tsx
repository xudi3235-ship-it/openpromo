import { Card } from "@openpromo/ui/components/card";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import type {
  InsightsStatus,
  WorkspaceInsightsSummaryResponse,
} from "@shared/insights";
import { formatDistanceToNow } from "date-fns";
import {
  Eye,
  MousePointerClick,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

type SummaryLike = WorkspaceInsightsSummaryResponse & {
  lastRefreshedAt: Date | string | null;
};

type StatusLike = InsightsStatus & {
  contentLastRefreshedAt: Date | string | null;
  followerLastCollectedAt: Date | string | null;
  inboxLastUpdatedAt: Date | string | null;
};

type WorkspaceHighlightsProps = {
  summary?: SummaryLike;
  status?: StatusLike;
  totalFollowers: number;
  isLoading?: boolean;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function formatNumber(value: number | null | undefined) {
  if (!value) return "0";
  return numberFormatter.format(value);
}

function formatRelative(date?: Date | string | null) {
  if (!date) return "Never";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function WorkspaceHighlights({
  summary,
  status,
  totalFollowers,
  isLoading,
}: WorkspaceHighlightsProps) {
  const totals = summary?.totals;

  const cards = [
    {
      key: "followers",
      label: "Total Followers",
      value: totalFollowers,
      icon: Users,
      description: `Synced ${formatRelative(status?.followerLastCollectedAt)}`,
    },
    {
      key: "impressions",
      label: "Impressions",
      value: totals?.impressions ?? 0,
      icon: Eye,
      description: `Updated ${formatRelative(status?.contentLastRefreshedAt)}`,
    },
    {
      key: "engagement",
      label: "Engagement",
      value: totals?.engagement ?? 0,
      icon: TrendingUp,
      description: `Updated ${formatRelative(status?.contentLastRefreshedAt)}`,
    },
    {
      key: "reach",
      label: "Reach",
      value: totals?.reach ?? 0,
      icon: Target,
      description: `Updated ${formatRelative(status?.contentLastRefreshedAt)}`,
    },
    {
      key: "clicks",
      label: "Clicks",
      value: totals?.clicks ?? 0,
      icon: MousePointerClick,
      description: `Updated ${formatRelative(status?.contentLastRefreshedAt)}`,
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.key}
            className="p-2.5 border-border/30 shadow-none group"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground/80 font-medium leading-tight">
                  {card.label}
                </p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-5 w-16" />
                ) : (
                  <p className="mt-0.5 text-lg font-semibold text-foreground tabular-nums">
                    {formatNumber(card.value)}
                  </p>
                )}
              </div>
              <div className="rounded bg-primary/8 p-1 text-primary/70">
                <Icon className="h-3 w-3" />
              </div>
            </div>
            <p className="mt-1.5 text-[9px] text-muted-foreground/70 leading-tight opacity-0 group-hover:opacity-100 transition-opacity">
              {card.description}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
