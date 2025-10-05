import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import type { SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, X } from "lucide-react";

interface SortingIndicatorProps {
  sorting: SortingState;
  onClearSorting: () => void;
}

const COLUMN_LABELS: Record<string, string> = {
  createdAt: "Created",
  scheduledDate: "Scheduled",
  status: "Status",
  platform: "Platform",
  engagement: "Engagement",
  reach: "Reach",
};

export function SortingIndicator({
  sorting,
  onClearSorting,
}: SortingIndicatorProps) {
  if (sorting.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-xs text-muted-foreground">Sorted by:</span>
      {sorting.map((sort) => (
        <Badge
          key={sort.id}
          variant="secondary"
          className="flex items-center gap-1 px-2 py-1"
        >
          <span className="text-xs">{COLUMN_LABELS[sort.id] || sort.id}</span>
          {sort.desc ? (
            <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUp className="w-3 h-3" />
          )}
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSorting}
        className="h-6 px-2 text-xs"
      >
        <X className="w-3 h-3 mr-1" />
        Clear
      </Button>
    </div>
  );
}
