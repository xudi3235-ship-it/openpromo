import { Badge } from "@openpromo/ui/components/badge";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Eye, TrendingUp } from "lucide-react";

type TopContentItem = {
  contentId: string;
  sourceContentId?: string;
  placement: string;
  metrics: {
    impressions?: number;
    engagement?: number;
    clicks?: number;
    likes?: number;
    comments?: number;
    shares?: number;
  };
  lastRefreshedAt?: string;
};

type InsightsTopContentProps = {
  items: TopContentItem[];
};

export function InsightsTopContent({ items }: InsightsTopContentProps) {
  if (!items || items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground mb-1">
          No content data available yet
        </p>
        <p className="text-xs text-muted-foreground/70">
          Post content to see performance metrics
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item.contentId}
          className="flex items-center gap-4 p-4 rounded-lg border border-border/40 hover:bg-accent/50 transition-colors"
        >
          {/* Rank */}
          <div className="flex-shrink-0 w-8 text-center">
            <span className="text-lg font-semibold text-muted-foreground">
              #{index + 1}
            </span>
          </div>

          {/* Content Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground truncate">
                {item.sourceContentId || item.contentId}
              </span>
              <Badge variant="outline" className="text-xs">
                {item.placement}
              </Badge>
            </div>
            {item.lastRefreshedAt && (
              <p className="text-xs text-muted-foreground">
                Updated{" "}
                {formatDistanceToNow(new Date(item.lastRefreshedAt), {
                  addSuffix: true,
                })}
              </p>
            )}
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="flex items-center gap-1 text-blue-500 mb-1">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  {(item.metrics.impressions ?? 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Impressions</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-green-500 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  {(item.metrics.engagement ?? 0).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Engagement</p>
            </div>
          </div>

          {/* Actions */}
          <button
            type="button"
            className="flex-shrink-0 p-2 hover:bg-accent rounded-md transition-colors"
            onClick={() => {
              // TODO: Navigate to content detail
            }}
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
}
