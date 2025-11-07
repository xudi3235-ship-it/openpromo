import type { WorkspaceInsightSnapshotRecord } from "@shared/insights";
import { formatDistanceToNow } from "date-fns";
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border/40 p-4 space-y-1"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-3xl font-semibold text-foreground">
              {formatValue(stat.value, stat.suffix, stat.precision)}
            </p>
            <p className="text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>
    </MomentumCard>
  );
}

function formatValue(
  value: number | undefined,
  suffix?: string,
  precision = 0,
) {
  if (value === undefined || value === null) return "—";
  const formatted =
    suffix === "%"
      ? (value * 100).toFixed(precision)
      : Number(value).toLocaleString();
  return suffix ? `${formatted}${suffix}` : formatted;
}
