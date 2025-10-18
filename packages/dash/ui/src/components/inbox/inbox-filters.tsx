import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import { cn } from "@openpromo/ui/lib/utils";
import type { AllPlatforms } from "@shared";
import { Search } from "lucide-react";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import type { InboxChannel } from "@/stores/inbox/types";
import { useInboxStore } from "@/stores/inbox-store";

const PLATFORM_ORDER: AllPlatforms[] = ["FACEBOOK", "INSTAGRAM", "TIKTOK"];

const channelOptions: { label: string; value: InboxChannel | null }[] = [
  { label: "All", value: null },
  { label: "Direct message", value: "dm" },
  { label: "Post comment", value: "post_comment" },
];

export function InboxFilters() {
  const search = useInboxStore((state) => state.search) ?? "";
  const selectedPlatform = useInboxStore((state) => state.selectedPlatform);
  const selectedChannel = useInboxStore((state) => state.selectedChannel);
  const setSearch = useInboxStore((state) => state.setSearch);
  const setChannel = useInboxStore((state) => state.setChannel);
  const setPlatform = useInboxStore((state) => state.setPlatform);
  const clearFilters = useInboxStore((state) => state.clearFilters);

  const hasActiveFilters = Boolean(
    search.trim() || selectedChannel || selectedPlatform,
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search contacts or conversations"
          className="h-9 rounded-full pl-9 text-sm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {channelOptions.map(({ label, value }) => {
            const isActive = selectedChannel === value;
            return (
              <Button
                key={label}
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setChannel(isActive ? null : value)}
                className={cn(
                  "h-8 rounded-full border border-border/40 bg-muted/15 px-3 text-xs font-medium transition-colors",
                  isActive
                    ? "border-border/70 bg-muted/40 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                {label}
              </Button>
            );
          })}
        </div>

        <span
          className="hidden h-4 w-px bg-border/60 sm:block"
          aria-hidden="true"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setPlatform(null)}
            className={cn(
              "h-8 rounded-full border border-border/40 bg-muted/15 px-3 text-xs font-medium transition-colors",
              selectedPlatform === null
                ? "border-border/70 bg-muted/40 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground/90",
            )}
          >
            All platforms
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
                  "h-8 rounded-full border border-border/40 bg-muted/15 px-3 text-xs font-medium transition-colors",
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
            className="ms-auto h-8 rounded-full border border-border/20 bg-muted/10 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
