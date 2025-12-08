import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface StatCardProps {
  /** Label/title for the stat */
  label: string;
  /** The main value to display */
  value: number | string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Optional description/hint text */
  description?: string;
  /** Optional suffix (e.g., "%", "K", "M") */
  suffix?: string;
  /** Optional prefix (e.g., "$", "€") */
  prefix?: string;
  /** Number of decimal places for number values */
  precision?: number;
  /** Trend indicator */
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  /** Custom value formatter */
  formatValue?: (value: number | string) => string;
  /** Custom className for the card */
  className?: string;
  /** Custom value className */
  valueClassName?: string;
  /** Custom actions/buttons to display */
  actions?: ReactNode;
  /** Variant styling */
  variant?: "default" | "compact";
}

/**
 * StatCard - Reusable metrics display card
 *
 * A consistent card component for displaying statistics, metrics, and KPIs
 * with optional icons, descriptions, trends, and formatting.
 *
 * @example Basic usage
 * ```tsx
 * <StatCard
 *   label="Total Engagement"
 *   value={1234}
 *   description="Across all platforms"
 * />
 * ```
 *
 * @example With icon and trend
 * ```tsx
 * <StatCard
 *   label="Revenue"
 *   value={45678}
 *   prefix="$"
 *   icon={DollarSign}
 *   trend={{ value: 12.5, isPositive: true }}
 * />
 * ```
 *
 * @example Percentage with precision
 * ```tsx
 * <StatCard
 *   label="Conversion Rate"
 *   value={0.156}
 *   suffix="%"
 *   precision={2}
 * />
 * ```
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  suffix,
  prefix,
  precision = 0,
  trend,
  formatValue,
  className = "",
  valueClassName = "",
  actions,
  variant = "default",
}: StatCardProps) {
  const formattedValue = formatValue
    ? formatValue(value)
    : formatStatValue(value, { suffix, prefix, precision });

  const isCompact = variant === "compact";

  return (
    <div
      className={`rounded-2xl border border-border/40 p-4 space-y-1 ${className}`}
    >
      {/* Label with optional icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <p
            className={`text-xs uppercase tracking-wide text-muted-foreground ${isCompact ? "font-normal" : "font-medium"}`}
          >
            {label}
          </p>
        </div>
        {actions}
      </div>

      {/* Value */}
      <p className={`text-3xl font-semibold text-foreground ${valueClassName}`}>
        {formattedValue}
      </p>

      {/* Description or trend */}
      {(description || trend) && (
        <div className="flex items-center justify-between gap-2">
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <div
              className={`text-xs font-medium ${
                trend.isPositive
                  ? "text-green-600"
                  : trend.isPositive === false
                    ? "text-red-600"
                    : "text-muted-foreground"
              }`}
            >
              {trend.isPositive ? "↑" : trend.isPositive === false ? "↓" : ""}{" "}
              {trend.value}%{trend.label ? ` ${trend.label}` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * StatCardGroup - Container for multiple stat cards
 *
 * A responsive grid container for organizing multiple stat cards.
 *
 * @example
 * ```tsx
 * <StatCardGroup>
 *   <StatCard label="Reach" value={1000} />
 *   <StatCard label="Engagement" value={500} />
 *   <StatCard label="Clicks" value={250} />
 * </StatCardGroup>
 * ```
 */
export function StatCardGroup({
  children,
  columns = "auto",
  className = "",
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | "auto";
  className?: string;
}) {
  const gridCols =
    columns === "auto"
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
      : `grid-cols-${columns}`;

  return (
    <div className={`grid gap-3 ${gridCols} ${className}`}>{children}</div>
  );
}

/**
 * Helper function to format stat values
 */
function formatStatValue(
  value: number | string,
  options: {
    suffix?: string;
    prefix?: string;
    precision?: number;
  } = {},
): string {
  const { suffix, prefix, precision = 0 } = options;

  if (value === undefined || value === null) return "—";

  let formatted: string;

  if (typeof value === "number") {
    // Handle percentage suffix
    if (suffix === "%") {
      formatted = (value * 100).toFixed(precision);
    } else {
      formatted = Number(value).toLocaleString(undefined, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      });
    }
  } else {
    formatted = String(value);
  }

  return `${prefix || ""}${formatted}${suffix || ""}`;
}
