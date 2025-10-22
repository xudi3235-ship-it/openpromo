/** biome-ignore-all lint/a11y/noNoninteractiveElementInteractions: ok */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: ok */
"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@openpromo/ui/components/command";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import type { MentionTrigger, TaggableEntity } from "./taggable-entities";

const SKELETON_KEYS = ["loading-1", "loading-2", "loading-3"];

interface MentionDropdownProps {
  open: boolean;
  position: { top: number; left: number };
  trigger: MentionTrigger;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  entities: TaggableEntity[];
  onSelect: (entity: TaggableEntity) => void;
  emptyStateMessage: string;
  showLoadingRow: boolean;
}

export function MentionDropdown({
  open,
  position,
  trigger,
  searchQuery,
  onSearchQueryChange,
  inputRef,
  entities,
  onSelect,
  emptyStateMessage,
  showLoadingRow,
}: MentionDropdownProps) {
  if (!open) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed z-[100]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
    >
      <Command
        className="border-border bg-popover w-[300px] rounded-lg border shadow-lg"
        shouldFilter={false}
      >
        <CommandInput
          ref={inputRef}
          value={searchQuery}
          onValueChange={onSearchQueryChange}
          className="hidden"
        />
        <CommandList className="max-h-[200px]">
          {!showLoadingRow && (
            <CommandEmpty className="font-geist text-sm p-4">
              {emptyStateMessage}
            </CommandEmpty>
          )}
          <CommandGroup>
            {showLoadingRow
              ? SKELETON_KEYS.map((key) => (
                  <CommandItem
                    key={key}
                    value={key}
                    disabled
                    className="cursor-default"
                  >
                    <Skeleton className="h-10 w-full" />
                  </CommandItem>
                ))
              : entities.map((entity) => (
                  <CommandItem
                    key={entity.id}
                    value={entity.value}
                    onSelect={() => onSelect(entity)}
                    className="cursor-pointer"
                  >
                    <MentionDropdownItem entity={entity} trigger={trigger} />
                  </CommandItem>
                ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>,
    document.body,
  );
}

function MentionDropdownItem({
  entity,
  trigger,
}: {
  entity: TaggableEntity;
  trigger: MentionTrigger;
}) {
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [],
  );

  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">{entity.name}</span>
      {trigger === "@" && (
        <span className="text-muted-foreground text-xs">{entity.value}</span>
      )}
      {trigger === "#" && entity.platformStats && (
        <div className="flex flex-col gap-0.5">
          {entity.platformStats.map((stat) => {
            const { icon: Icon, accentTextClass } = getPlatformMeta(
              stat.platform,
            );
            const parts: string[] = [];
            if (typeof stat.usageCount === "number") {
              parts.push(`${numberFormatter.format(stat.usageCount)} posts`);
            }
            if (typeof stat.viewCount === "number") {
              parts.push(`${numberFormatter.format(stat.viewCount)} views`);
            }
            const statsText =
              parts.length > 0 ? parts.join(" / ") : "data unavailable";

            return (
              <div
                key={stat.platform}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                {Icon && <Icon className={`h-3 w-3 ${accentTextClass}`} />}
                <span>{statsText}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
