import { Button } from "@openpromo/ui/components/button";
import type { ReactNode } from "react";

export interface FilterButtonOption<T = string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface FilterButtonGroupProps<T = string> {
  /** Current selected value */
  value?: T;
  /** Change handler */
  onValueChange: (value: T | undefined) => void;
  /** Available options */
  options: FilterButtonOption<T>[];
  /** Allow deselection */
  allowDeselect?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * FilterButtonGroup - Toggle button filter component
 *
 * A button group for filtering with toggle behavior, commonly used
 * for platform selection or category filtering.
 *
 * @example
 * ```tsx
 * <FilterButtonGroup
 *   value={platform}
 *   onValueChange={setPlatform}
 *   options={[
 *     { value: 'facebook', label: 'Facebook', icon: <FbIcon /> },
 *     { value: 'instagram', label: 'Instagram', icon: <IgIcon /> }
 *   ]}
 *   allowDeselect
 * />
 * ```
 */
export function FilterButtonGroup<T extends string = string>({
  value,
  onValueChange,
  options,
  allowDeselect = true,
  className = "",
}: FilterButtonGroupProps<T>) {
  const handleClick = (optionValue: T) => {
    if (value === optionValue && allowDeselect) {
      onValueChange(undefined);
    } else {
      onValueChange(optionValue);
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <Button
            key={option.value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => handleClick(option.value)}
            className="gap-2 h-9"
          >
            {option.icon}
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
