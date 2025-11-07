import type { WorkspaceInsightSnapshotRecord } from "@shared/insights";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  MessageCircle,
  MousePointerClick,
  TrendingUp,
  Users,
} from "lucide-react";

type InsightsSummaryCardsProps = {
  snapshotRecord?: WorkspaceInsightSnapshotRecord;
};

export function InsightsSummaryCards({
  snapshotRecord,
}: InsightsSummaryCardsProps) {
  const funnel = snapshotRecord?.snapshot.funnel;

  const totals = {
    reach: funnel?.awareness ?? 0,
    engagement: funnel?.engagement ?? 0,
    clicks: funnel?.clicks ?? 0,
    conversions: funnel?.conversions ?? 0,
    conversionRate: funnel?.conversionRate ?? 0,
  };

  const lastRefreshed = snapshotRecord?.snapshotDate
    ? formatDistanceToNow(new Date(snapshotRecord.snapshotDate), {
        addSuffix: true,
      })
    : null;

  const cards = [
    {
      label: "Total Engagement",
      value: totals.engagement ?? 0,
      icon: TrendingUp,
      color: "text-green-500",
    },
    {
      label: "Reach",
      value: totals.reach,
      icon: Users,
      color: "text-teal-500",
    },
    {
      label: "Clicks",
      value: totals.clicks,
      icon: MousePointerClick,
      color: "text-purple-500",
    },
    {
      label: "Conversions",
      value: totals.conversions,
      icon: Heart,
      color: "text-red-500",
    },
    {
      label: "Conversion Rate",
      value: totals.conversionRate,
      icon: MessageCircle,
      color: "text-yellow-500",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card rounded-lg p-4 border border-border/40"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground mb-1">
                  {card.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>
      {lastRefreshed && (
        <p className="text-xs text-muted-foreground text-right">
          Last updated {lastRefreshed}
        </p>
      )}
    </div>
  );
}
