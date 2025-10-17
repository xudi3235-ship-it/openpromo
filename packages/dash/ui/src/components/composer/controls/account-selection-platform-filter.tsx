import type { Platform } from "@core/schemas/connected-account.sql";
import { cn } from "@openpromo/ui/lib/utils";
import type { PlatformMeta } from "@/components/composer/utils/platform-style";

export type PlatformFilter = "ALL" | Platform;

export interface PlatformFilterOption {
  value: PlatformFilter;
  label: string;
  count: number;
  meta?: PlatformMeta;
}

interface AccountSelectionPlatformFilterProps {
  options: PlatformFilterOption[];
  value: PlatformFilter;
  onChange: (value: PlatformFilter) => void;
  filteredCount: number;
  visibleSelectedCount: number;
  allFilteredSelected: boolean;
  onToggleVisibleSelection: () => void;
}

export function AccountSelectionPlatformFilter({
  options,
  value,
  onChange,
  filteredCount,
  visibleSelectedCount,
  allFilteredSelected,
  onToggleVisibleSelection,
}: AccountSelectionPlatformFilterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map(({ value: optionValue, label, count, meta }) => {
          const isActive = optionValue === value;
          const IconComponent = optionValue === "ALL" ? undefined : meta?.icon;

          return (
            <button
              key={optionValue}
              type="button"
              onClick={() => onChange(optionValue)}
              aria-pressed={isActive}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-medium transition-colors backdrop-blur-sm",
                isActive &&
                  (optionValue === "ALL"
                    ? "border-foreground/60 bg-foreground text-background shadow-sm"
                    : cn(
                        meta?.accentTextClass ?? "",
                        "border-border/50 bg-muted shadow-sm",
                      )),
                !isActive && "text-muted-foreground/90 hover:text-foreground",
              )}
            >
              {IconComponent && <IconComponent className="h-3 w-3" />}
              <span>{label}</span>
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  isActive ? "text-current" : "text-muted-foreground/70",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onToggleVisibleSelection}
        disabled={filteredCount === 0}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-medium transition-colors",
          filteredCount === 0
            ? "cursor-not-allowed text-muted-foreground/50"
            : allFilteredSelected
              ? "text-foreground"
              : "text-muted-foreground/80 hover:text-foreground",
        )}
      >
        {allFilteredSelected ? "Deselect visible" : "Select visible"}
        {filteredCount > 0 && (
          <span className="text-[10px] font-semibold text-muted-foreground/70">
            {visibleSelectedCount}/{filteredCount}
          </span>
        )}
      </button>
    </div>
  );
}
