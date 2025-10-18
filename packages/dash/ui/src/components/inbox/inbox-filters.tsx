import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import { cn } from "@openpromo/ui/lib/utils";
import type { AllPlatforms } from "@shared";
import { Search } from "lucide-react";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import { useInboxStore } from "@/stores/inbox-store";

const PLATFORM_ORDER: AllPlatforms[] = ["FACEBOOK", "INSTAGRAM", "TIKTOK"];

export function InboxFilters() {
  const search = useInboxStore((state) => state.search) ?? "";
  const selectedPlatform = useInboxStore((state) => state.selectedPlatform);
  const selectedChannel = useInboxStore((state) => state.selectedChannel);
  const setSearch = useInboxStore((state) => state.setSearch);
  const setPlatform = useInboxStore((state) => state.setPlatform);
  const clearFilters = useInboxStore((state) => state.clearFilters);

  const hasActiveFilters = Boolean(
    search.trim() || selectedChannel || selectedPlatform,
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search contacts or conversations"
          className="h-9 rounded-lg pl-9 text-sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setPlatform(null)}
            className={cn(
              "h-8 rounded-lg border border-border/40 bg-muted/15 px-2.5 text-xs font-medium transition-colors",
              selectedPlatform === null
                ? "border-border/70 bg-muted/40 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground/90",
            )}
          >
            All
          </Button>
          {PLATFORM_ORDER.map((platform) => {
            const meta = getPlatformMeta(platform);
            const isActive = selectedPlatform === platform;
            const Icon = meta.icon;
            return (
              <Button
                key={platform}
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPlatform(isActive ? null : platform)}
                className={cn(
                  "h-8 rounded-lg border border-border/40 bg-muted/15 px-2 text-xs font-medium transition-colors",
                  isActive
                    ? cn(
                        meta.accentTextClass,
                        "border-border/70 bg-muted/35 text-foreground shadow-sm ring-1 ring-border/40",
                      )
                    : "text-muted-foreground hover:text-foreground/90",
                )}
              >
                {Icon && (
                  <Icon className={cn("h-3.5 w-3.5", meta.accentTextClass)} />
                )}
                {meta.label}
              </Button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              clearFilters();
            }}
            className="ms-auto h-8 rounded-lg border border-border/20 bg-muted/10 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
