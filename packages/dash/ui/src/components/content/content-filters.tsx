import {
  type AllPlatforms,
  AllPlatforms as AllPlatformsEnum,
  type ContentPublishingStatus,
  ContentPublishingStatus as ContentPublishingStatusEnum,
} from "@shared/content";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, CircleDashed } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa";
import { FilterBar, FilterDateRange, FilterSelect } from "@/components/common";

export interface ContentFilters {
  publishingStatus?: ContentPublishingStatus;
  dateRange?: DateRange;
  platform?: AllPlatforms;
}

interface ContentFiltersProps {
  filters: ContentFilters;
  onFiltersChange: (filters: ContentFilters) => void;
  showDateFilter?: boolean;
  // Batch actions slot - rendered on the right side of the filter bar
  batchActions?: React.ReactNode;
}

const PUBLISHING_STATUS_OPTIONS: Array<{
  value: ContentPublishingStatus;
  label: string;
  icon: LucideIcon;
}> = [
  {
    value: ContentPublishingStatusEnum.DRAFT,
    label: "Unpublished",
    icon: CircleDashed,
  },
  {
    value: ContentPublishingStatusEnum.PUBLISHED,
    label: "Published",
    icon: CheckCircle2,
  },
  {
    value: ContentPublishingStatusEnum.FAILED_TO_PUBLISH,
    label: "Failed",
    icon: AlertCircle,
  },
];

const PLATFORM_OPTIONS: Array<{
  value: AllPlatforms;
  label: string;
  // biome-ignore lint/suspicious/noExplicitAny: icon can be any renderable element
  icon: any;
}> = [
  {
    value: AllPlatformsEnum.FACEBOOK,
    label: "Facebook",
    icon: <FaFacebook className="h-4 w-4 text-blue-600" />,
  },
  {
    value: AllPlatformsEnum.INSTAGRAM,
    label: "Instagram",
    icon: <FaInstagram className="h-4 w-4 text-pink-600" />,
  },
  {
    value: AllPlatformsEnum.TIKTOK,
    label: "TikTok",
    icon: <FaTiktok className="h-3 w-3 text-black" />,
  },
] as const;

export function ContentFilters({
  filters,
  onFiltersChange,
  showDateFilter = true,
  batchActions,
}: ContentFiltersProps) {
  const hasActiveFilters = Boolean(
    filters.publishingStatus || filters.dateRange?.from || filters.platform,
  );

  const clearFilters = () => {
    onFiltersChange({});
  };

  const updatePublishingStatus = (
    status: ContentPublishingStatus | undefined,
  ) => {
    onFiltersChange({
      ...filters,
      publishingStatus: status,
    });
  };

  const updatePlatform = (platform: AllPlatforms | undefined) => {
    onFiltersChange({
      ...filters,
      platform,
    });
  };

  const updateDateRange = (dateRange: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange,
    });
  };

  // Convert platform options to filter option format
  const platformOptions = PLATFORM_OPTIONS.map(({ value, label, icon }) => ({
    value,
    label,
    icon,
  }));

  // Convert status options to filter option format
  const statusOptions = PUBLISHING_STATUS_OPTIONS.map(
    ({ value, label, icon: Icon }) => ({
      value,
      label,
      icon: <Icon className="h-4 w-4" />,
    }),
  );

  return (
    <FilterBar
      hasActiveFilters={hasActiveFilters}
      onClearFilters={clearFilters}
      rightContent={batchActions}
    >
      <FilterSelect
        value={filters.publishingStatus}
        onValueChange={updatePublishingStatus}
        options={statusOptions}
        placeholder="Status"
        allLabel="All Statuses"
      />

      <FilterSelect
        value={filters.platform}
        onValueChange={updatePlatform}
        options={platformOptions}
        placeholder="Platform"
        allLabel="All Platforms"
      />

      {showDateFilter && (
        <FilterDateRange
          value={filters.dateRange}
          onValueChange={updateDateRange}
          placeholder="Select date range..."
        />
      )}
    </FilterBar>
  );
}
