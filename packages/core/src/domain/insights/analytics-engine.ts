import { Binding } from "@core/helpers/api-env";
import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import type { AllPlacement } from "@shared/content";

type InsightDimensions = Record<
  string,
  string | number | boolean | null | undefined
>;

export type InsightAnalyticsEvent = {
  workspaceId: string;
  domain: string;
  entityType: string;
  entityId: string;
  collectedAt: Date;
  metrics: Record<string, number | null | undefined>;
  dimensions?: InsightDimensions;
};

export type ContentMetricsAnalyticsPoint = {
  workspaceId: string;
  contentId: string;
  placement: AllPlacement;
  sourceContentId?: string | null;
  platform?: string | null;
  collectedAt: Date;
  metrics: UnifiedContentMetrics;
};

export function writeContentMetricsAnalytics(
  points: ContentMetricsAnalyticsPoint[],
): void {
  if (points.length === 0) return;

  const events: InsightAnalyticsEvent[] = points.map((point) => ({
    workspaceId: point.workspaceId,
    domain: "content",
    entityType: "unified_content",
    entityId: point.contentId,
    collectedAt: point.collectedAt,
    metrics: point.metrics,
    dimensions: {
      placement: point.placement,
      source_content_id: point.sourceContentId ?? null,
      platform:
        point.platform ?? inferPlatformFromPlacement(point.placement) ?? null,
    },
  }));

  writeInsightAnalytics(events);
}

export function writeInsightAnalytics(events: InsightAnalyticsEvent[]): void {
  if (events.length === 0) return;

  const dataset = getWorkspaceInsightsDataset();
  if (!dataset) return;

  const dimensionKeys = extractDimensionKeys(events);

  for (const event of events) {
    const { metrics } = event;
    if (!metrics) continue;

    for (const [metricName, rawValue] of Object.entries(metrics)) {
      if (rawValue === null || rawValue === undefined) continue;
      const value = Number(rawValue);
      if (!Number.isFinite(value)) continue;

      const indexes: (string | ArrayBuffer | null)[] = [
        event.workspaceId,
        event.domain,
        event.entityType,
        event.entityId,
        metricName,
        event.collectedAt.toISOString(),
      ];

      for (const key of dimensionKeys) {
        const dimensionValue = event.dimensions?.[key];
        indexes.push(normalizeDimensionValue(dimensionValue));
      }
      console.log("Writing analytics data point", { indexes, value });
      dataset.writeDataPoint({
        indexes,
        doubles: [value],
      });
    }
  }
}

function extractDimensionKeys(events: InsightAnalyticsEvent[]): string[] {
  const keySet = new Set<string>();
  for (const event of events) {
    if (!event.dimensions) continue;
    for (const key of Object.keys(event.dimensions)) {
      keySet.add(key);
    }
  }

  return Array.from(keySet).sort();
}

function normalizeDimensionValue(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return "";
}

function getWorkspaceInsightsDataset(): AnalyticsEngineDataset | null {
  try {
    const bindings = Binding.use();
    const dataset = bindings.WorkspaceInsightsAnalytics;
    if (isAnalyticsDataset(dataset)) {
      return dataset;
    }
  } catch {
    // No binding context available (e.g. during tests); silently skip.
  }
  return null;
}

function isAnalyticsDataset(
  candidate: unknown,
): candidate is AnalyticsEngineDataset {
  return Boolean(
    candidate &&
      typeof candidate === "object" &&
      "writeDataPoint" in candidate &&
      typeof (candidate as AnalyticsEngineDataset).writeDataPoint ===
        "function",
  );
}

function inferPlatformFromPlacement(
  placement: AllPlacement,
): "facebook" | "instagram" | "tiktok" | null {
  if (placement.startsWith("FB_")) return "facebook";
  if (placement.startsWith("IG_")) return "instagram";
  if (placement.startsWith("TT_")) return "tiktok";
  return null;
}
