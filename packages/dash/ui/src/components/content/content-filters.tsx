import { Button } from "@openpromo/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import { DateRangePicker } from "@openpromo/ui/components/time/date-range-picker";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, CircleDashed, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

export interface ContentFilters {
  publishingStatus?: string;
  dateRange?: DateRange;
}

interface ContentFiltersProps {
  filters: ContentFilters;
  onFiltersChange: (filters: ContentFilters) => void;
}

const PUBLISHING_STATUS_OPTIONS: Array<{
  value: string;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "DRAFT", label: "Unpublished", icon: CircleDashed },
  { value: "PUBLISHED", label: "Published", icon: CheckCircle2 },
  { value: "FAILED_TO_PUBLISH", label: "Failed", icon: AlertCircle },
];

export function ContentFilters({
  filters,
  onFiltersChange,
}: ContentFiltersProps) {
  const hasActiveFilters = Boolean(
    filters.publishingStatus || filters.dateRange?.from,
  );

  const clearFilters = () => {
    onFiltersChange({});
  };

  const updatePublishingStatus = (status: string | undefined) => {
    onFiltersChange({
      ...filters,
      publishingStatus: status === "all" ? undefined : status,
    });
  };

  const updateDateRange = (dateRange: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange,
    });
  };

  return (
    <div className="flex items-center gap-4 mb-4">
      {/* Publishing Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Status:
        </span>
        <Select
          value={filters.publishingStatus || "all"}
          onValueChange={updatePublishingStatus}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PUBLISHING_STATUS_OPTIONS.map(({ value, label, icon: Icon }) => (
              <SelectItem key={value} value={value}>
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Date:</span>
        <DateRangePicker
          date={filters.dateRange}
          onDateChange={updateDateRange}
          placeholder="Select date range..."
          className="w-64"
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
