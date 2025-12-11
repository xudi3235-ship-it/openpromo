import { Badge } from "@openpromo/ui/components/badge";
import { cn } from "@openpromo/ui/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Clock } from "lucide-react";

interface MetricsFreshnessBadgeProps {
  lastRefreshedAt: Date | string | null | undefined;
  className?: string;
}

export function MetricsFreshnessBadge({
  lastRefreshedAt,
  className,
}: MetricsFreshnessBadgeProps) {
  if (!lastRefreshedAt) {
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        <AlertTriangle className="w-3 h-3 mr-1" />
        No data
      </Badge>
    );
  }

  const now = new Date();
  const refreshedAt = new Date(lastRefreshedAt);
  const hoursDiff = (now.getTime() - refreshedAt.getTime()) / (1000 * 60 * 60);

  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let icon = <Clock className="w-3 h-3 mr-1" />;
  let text = formatDistanceToNow(refreshedAt, { addSuffix: true });

  if (hoursDiff <= 24) {
    variant = "default";
    text = "Fresh";
  } else if (hoursDiff <= 72) {
    variant = "secondary";
  } else {
    variant = "destructive";
    icon = <AlertTriangle className="w-3 h-3 mr-1" />;
  }

  return (
    <Badge variant={variant} className={cn("text-xs", className)}>
      {icon}
      {text}
    </Badge>
  );
}
