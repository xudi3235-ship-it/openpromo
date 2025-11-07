import { Skeleton } from "@openpromo/ui/components/skeleton";
import type { InsightNarrativeHighlight } from "@shared/insights";

type InsightsNarrativeHighlightsProps = {
  highlights?: InsightNarrativeHighlight[];
  isLoading?: boolean;
};

export function InsightsNarrativeHighlights({
  highlights,
  isLoading,
}: InsightsNarrativeHighlightsProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border/40">
        <Skeleton className="h-5 w-40 mb-4 rounded" />
        <Skeleton className="h-4 w-full mb-2 rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
    );
  }

  if (!highlights || highlights.length === 0) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border/40">
        <h2 className="font-medium text-foreground mb-2">Key takeaways</h2>
        <p className="text-sm text-muted-foreground">
          Once we collect enough data we&apos;ll surface highlights about your
          recent performance.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 border border-border/40 space-y-4">
      <div>
        <h2 className="font-medium text-foreground">Key takeaways</h2>
        <p className="text-xs text-muted-foreground">
          AI-generated insights grounded in your recent metrics
        </p>
      </div>
      <div className="space-y-3">
        {highlights.map((item, idx) => (
          <div
            key={`${item.metric ?? "highlight"}-${idx}`}
            className="rounded-lg border border-border/40 bg-background p-4"
          >
            <p className="font-medium text-foreground mb-1">{item.headline}</p>
            {item.body && (
              <p className="text-sm text-muted-foreground">{item.body}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
