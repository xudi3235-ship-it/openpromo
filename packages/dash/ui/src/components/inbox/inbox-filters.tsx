import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@openpromo/ui/components/tooltip";
import { cn } from "@openpromo/ui/lib/utils";
import type { AllPlatforms } from "@shared";
import { Circle, Search, X } from "lucide-react";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import { useInboxStore } from "@/stores/inbox-store";

const PLATFORM_ORDER: AllPlatforms[] = ["FACEBOOK", "INSTAGRAM", "TIKTOK"];

export function InboxFilters() {
  const search = useInboxStore((state) => state.search) ?? "";
  const selectedPlatform = useInboxStore((state) => state.selectedPlatform);
  const selectedChannel = useInboxStore((state) => state.selectedChannel);
  const showUnreadOnly = useInboxStore((state) => state.showUnreadOnly);
  const setSearch = useInboxStore((state) => state.setSearch);
  const setPlatform = useInboxStore((state) => state.setPlatform);
  const setShowUnreadOnly = useInboxStore((state) => state.setShowUnreadOnly);
  const clearFilters = useInboxStore((state) => state.clearFilters);

  const hasActiveFilters = Boolean(
    search.trim() || selectedChannel || selectedPlatform || showUnreadOnly,
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search conversations..."
          className="h-8 rounded-md pl-8 pr-8 text-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-1.5">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-1">
            {/* Unread filter */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  className={cn(
                    "h-7 w-7 rounded-md border p-0 transition-colors",
                    showUnreadOnly
                      ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                      : "border-border/40 bg-muted/15 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Circle
                    className={cn(
                      "h-3 w-3",
                      showUnreadOnly ? "fill-current" : "",
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {showUnreadOnly ? "Show all" : "Unread only"}
              </TooltipContent>
            </Tooltip>

            {/* Platform filters - icon only */}
            {PLATFORM_ORDER.map((platform) => {
              const meta = getPlatformMeta(platform);
              const isActive = selectedPlatform === platform;
              const Icon = meta.icon;
              return (
                <Tooltip key={platform}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setPlatform(isActive ? null : platform)}
                      className={cn(
                        "h-7 w-7 rounded-md border p-0 transition-colors",
                        isActive
                          ? cn(
                              "border-border/60 bg-muted/20 shadow-sm ring-1 ring-border/30",
                              meta.accentTextClass,
                            )
                          : "border-border/40 bg-muted/15 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {meta.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {hasActiveFilters && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clearFilters}
            className="h-7 rounded-md px-2 text-[10px] font-medium text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
