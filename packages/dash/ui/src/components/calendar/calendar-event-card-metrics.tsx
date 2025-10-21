import type { UnifiedContentMetrics } from "@core/schemas/content.sql";
import { Eye, Heart, MessageCircle } from "lucide-react";

interface CalendarEventCardMetricsProps {
  metrics?: UnifiedContentMetrics;
  platformIcon?: React.ReactNode;
}

export function CalendarEventCardMetrics({
  metrics,
  platformIcon,
}: CalendarEventCardMetricsProps) {
  return (
    <div className="flex items-end justify-between gap-2 mt-auto">
      {/* Engagement metrics */}
      {metrics ? (
        <div className="flex items-center gap-2 flex-wrap">
          {metrics.likes != null && metrics.likes > 0 && (
            <div className="flex items-center gap-0.5">
              <Heart className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {metrics.likes.toLocaleString()}
              </span>
            </div>
          )}
          {metrics.comments != null && metrics.comments > 0 && (
            <div className="flex items-center gap-0.5">
              <MessageCircle className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {metrics.comments.toLocaleString()}
              </span>
            </div>
          )}
          {metrics.reach != null && metrics.reach > 0 && (
            <div className="flex items-center gap-0.5">
              <Eye className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {metrics.reach.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div />
      )}

      {/* Platform icon */}
      {platformIcon && (
        <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full p-1">
          {platformIcon}
        </div>
      )}
    </div>
  );
}
