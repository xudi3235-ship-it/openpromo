import { DateRangePicker } from "@openpromo/ui/components/time/date-range-picker";
import type { DateRange } from "react-day-picker";

export interface FilterDateRangeProps {
  /** Current date range */
  value?: DateRange;
  /** Change handler */
  onValueChange: (value: DateRange | undefined) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Custom className */
  className?: string;
  /** Width class */
  width?: string;
}

/**
 * FilterDateRange - Date range picker filter
 *
 * A date range picker component for filtering by date ranges,
 * wrapping the UI package DateRangePicker with filter semantics.
 *
 * @example
 * ```tsx
 * <FilterDateRange
 *   value={dateRange}
 *   onValueChange={setDateRange}
 *   placeholder="Select date range..."
 * />
 * ```
 */
export function FilterDateRange({
  value,
  onValueChange,
  placeholder = "Select date range...",
  className = "",
  width = "w-64",
}: FilterDateRangeProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <DateRangePicker
        date={value}
        onDateChange={onValueChange}
        placeholder={placeholder}
        className={width}
      />
    </div>
  );
}
