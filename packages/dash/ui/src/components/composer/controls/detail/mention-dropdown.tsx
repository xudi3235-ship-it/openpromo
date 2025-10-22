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
import { createPortal } from "react-dom";
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
      <Command className="border-border bg-popover w-[300px] rounded-lg border shadow-lg">
        <CommandInput
          ref={inputRef}
          value={searchQuery}
          onValueChange={onSearchQueryChange}
          className="hidden"
        />
        <CommandList className="max-h-[200px]">
          {!showLoadingRow && <CommandEmpty>{emptyStateMessage}</CommandEmpty>}
          <CommandGroup>
            {showLoadingRow &&
              SKELETON_KEYS.map((key) => (
                <CommandItem
                  key={key}
                  value={key}
                  disabled
                  className="cursor-default"
                >
                  <MentionSkeleton />
                </CommandItem>
              ))}
            {entities.map((entity) => (
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
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{entity.name}</span>
      {trigger === "@" && (
        <span className="text-muted-foreground text-xs">{entity.value}</span>
      )}
      {entity.description && (
        <span className="text-muted-foreground text-xs">
          {entity.description}
        </span>
      )}
      {entity.meta?.map((line) => (
        <span key={line} className="text-muted-foreground text-xs">
          {line}
        </span>
      ))}
    </div>
  );
}

function MentionSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-muted/40 p-3">
      <Skeleton className="h-4 w-1/3" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
