import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import type { ReactNode } from "react";

export interface FilterOption<T = string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface FilterSelectProps<T = string> {
  /** Current selected value */
  value?: T;
  /** Change handler */
  onValueChange: (value: T | undefined) => void;
  /** Available options */
  options: FilterOption<T>[];
  /** Placeholder text */
  placeholder?: string;
  /** Label for "all" option */
  allLabel?: string;
  /** Custom className */
  className?: string;
  /** Width class */
  width?: string;
}

/**
 * FilterSelect - Dropdown filter component
 *
 * A standardized select component for filtering with optional icons
 * and automatic "All" option.
 *
 * @example
 * ```tsx
 * <FilterSelect
 *   value={status}
 *   onValueChange={setStatus}
 *   options={[
 *     { value: 'published', label: 'Published', icon: <CheckIcon /> },
 *     { value: 'draft', label: 'Draft', icon: <CircleIcon /> }
 *   ]}
 *   placeholder="Status"
 * />
 * ```
 */
export function FilterSelect<T extends string = string>({
  value,
  onValueChange,
  options,
  placeholder = "All",
  allLabel = `All ${placeholder}`,
  className = "",
  width = "w-36",
}: FilterSelectProps<T>) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Select
        value={value || "all"}
        onValueChange={(val) => {
          onValueChange(val === "all" ? undefined : (val as T));
        }}
      >
        <SelectTrigger className={`${width} h-9 text-sm`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.icon ? (
                <span className="flex items-center gap-2">
                  {option.icon}
                  {option.label}
                </span>
              ) : (
                option.label
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
