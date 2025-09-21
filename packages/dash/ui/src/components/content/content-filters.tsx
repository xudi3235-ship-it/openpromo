import { Button } from "@openpromo/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import { DateRangePicker } from "@openpromo/ui/components/time/date-range-picker";
import { X } from "lucide-react";
import type { DateRange } from "react-day-picker";

export interface ContentFilters {
  publishingStatus?: string;
  dateRange?: DateRange;
}

interface ContentFiltersProps {
  filters: ContentFilters;
  onFiltersChange: (filters: ContentFilters) => void;
}

const PUBLISHING_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PUBLISHED", label: "Published" },
  { value: "FAILED_TO_PUBLISH", label: "Failed to Publish" },
  { value: "PUBLISH_NOW", label: "Publishing Now" },
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
            {PUBLISHING_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
