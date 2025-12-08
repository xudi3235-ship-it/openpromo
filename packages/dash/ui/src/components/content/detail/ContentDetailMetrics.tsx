import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Caption, H4, Text } from "@openpromo/ui/components/typography";
import { formatDistanceToNow } from "date-fns";

const METRIC_DEFINITIONS: {
  key: keyof UnifiedContentMetrics;
  label: string;
}[] = [
  { key: "impressions", label: "Impressions" },
  { key: "reach", label: "Reach" },
  { key: "engagement", label: "Engagement" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
];

type ContentDetailMetricsProps = {
  metrics?: UnifiedContentMetrics;
  refreshedAt?: Date | null;
};

function formatMetric(value?: number | null) {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value.toLocaleString();
  }
  return "—";
}

export function ContentDetailMetrics({
  metrics = {},
  refreshedAt,
}: ContentDetailMetricsProps) {
  const refreshLabel = refreshedAt
    ? `Updated ${formatDistanceToNow(refreshedAt, { addSuffix: true })}`
    : "Not yet available";

  return (
    <div className="space-y-4">
      <div>
        <H4 className="text-base">Performance</H4>
        <Caption tone="muted">{refreshLabel}</Caption>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-3 grid-cols-2">
        {METRIC_DEFINITIONS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Caption tone="muted" className="text-xs">
              {label}
            </Caption>
            <Text size="sm" weight="semibold">
              {formatMetric(metrics[key])}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}
