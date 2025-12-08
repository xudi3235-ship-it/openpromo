import type { WorkspaceInsightSnapshotRecord } from "@shared/insights";
import { formatDistanceToNow } from "date-fns";
import { StatCard, StatCardGroup } from "@/components/common";
import { MomentumCard } from "@/components/momentum/MomentumCard";

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

  const stats = [
    {
      label: "Total engagement",
      value: totals.engagement,
      hint: "Across your selected window",
    },
    {
      label: "Reach",
      value: totals.reach,
      hint: "Unique accounts touched",
    },
    {
      label: "Clicks",
      value: totals.clicks,
      hint: "Traffic driven from posts",
    },
    {
      label: "Conversions",
      value: totals.conversions,
      hint: "Goals completed",
    },
    {
      label: "Conversion rate",
      value: totals.conversionRate,
      hint: "Conversions / clicks",
      suffix: "%",
      precision: 1,
    },
  ];

  return (
    <MomentumCard className="space-y-6">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Funnel snapshot</p>
          <p className="text-xs text-muted-foreground">
            Engagement summary pulled from your latest insight run
          </p>
        </div>
        {lastRefreshed ? (
          <p className="text-xs text-muted-foreground">
            Updated {lastRefreshed}
          </p>
        ) : null}
      </div>
      <StatCardGroup columns="auto">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            description={stat.hint}
            suffix={stat.suffix}
            precision={stat.precision}
          />
        ))}
      </StatCardGroup>
    </MomentumCard>
  );
}
