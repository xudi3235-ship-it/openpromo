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
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa";

export interface ContentFilters {
  publishingStatus?: string;
  dateRange?: DateRange;
  platform?: string;
}

interface ContentFiltersProps {
  filters: ContentFilters;
  onFiltersChange: (filters: ContentFilters) => void;
  showDateFilter?: boolean;
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

const PLATFORM_OPTIONS: Array<{
  value: string;
  label: string;
  // biome-ignore lint/suspicious/noExplicitAny: icon can be any renderable element
  icon: any;
}> = [
  {
    value: "FACEBOOK",
    label: "Facebook",
    icon: <FaFacebook className="h-4 w-4 text-blue-600" />,
  },
  {
    value: "INSTAGRAM",
    label: "Instagram",
    icon: <FaInstagram className="h-4 w-4 text-pink-600" />,
  },
  {
    value: "TIKTOK",
    label: "TikTok",
    icon: <FaTiktok className="h-3 w-3 text-black" />,
  },
] as const;

export function ContentFilters({
  filters,
  onFiltersChange,
  showDateFilter = true,
}: ContentFiltersProps) {
  const hasActiveFilters = Boolean(
    filters.publishingStatus || filters.dateRange?.from || filters.platform,
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

  const updatePlatform = (platform: string | undefined) => {
    onFiltersChange({
      ...filters,
      platform: platform === "all" ? undefined : platform,
    });
  };

  const updateDateRange = (dateRange: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange,
    });
  };

  return (
    <div className="flex items-center gap-2 mb-2">
      {/* Publishing Status Filter */}
      <div className="flex items-center gap-1.5">
        <Select
          value={filters.publishingStatus || "all"}
          onValueChange={updatePublishingStatus}
        >
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PUBLISHING_STATUS_OPTIONS.map(({ value, label, icon: Icon }) => (
              <SelectItem key={value} value={value}>
                <span className="flex items-center gap-2">
                  <Icon className="h-3 w-3" />
                  {label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Platform Filter */}
      <div className="flex items-center gap-1.5">
        <Select
          value={filters.platform || "all"}
          onValueChange={updatePlatform}
        >
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORM_OPTIONS.map(({ value, label, icon }) => (
              <SelectItem key={value} value={value}>
                <span className="flex items-center gap-2">
                  {icon}
                  {label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Range Filter */}
      {showDateFilter && (
        <div className="flex items-center gap-1.5">
          <DateRangePicker
            date={filters.dateRange}
            onDateChange={updateDateRange}
            placeholder="Select date range..."
            className="w-56"
          />
        </div>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground h-8 px-2"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
