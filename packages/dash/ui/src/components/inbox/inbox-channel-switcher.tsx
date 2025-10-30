import { Button } from "@openpromo/ui/components/button";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import { type InboxChannel, useInboxFilters } from "@/hooks/useInboxFilters";

interface ChannelOption {
  value: InboxChannel;
  label: string;
  description: string;
}

const CHANNEL_OPTIONS: ChannelOption[] = [
  {
    value: null,
    label: "All conversations",
    description: "Everything across channels",
  },
  {
    value: "dm",
    label: "Direct messages",
    description: "1:1 inbox threads",
  },
  {
    value: "post_comment",
    label: "Post comments",
    description: "Comments left on content",
  },
];

interface InboxChannelSwitcherProps {
  totalCount: number;
  isSyncing: boolean;
}

export function InboxChannelSwitcher({
  totalCount,
  isSyncing,
}: InboxChannelSwitcherProps) {
  const { selectedChannel, selectedPlatform, setChannel } = useInboxFilters();

  const platformMeta = useMemo(() => {
    if (!selectedPlatform) return null;
    return getPlatformMeta(selectedPlatform);
  }, [selectedPlatform]);

  return (
    <section className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">Inbox</span>
        {CHANNEL_OPTIONS.map((option) => {
          const isActive = selectedChannel === option.value;
          return (
            <Button
              key={option.label}
              type="button"
              size="sm"
              variant={isActive ? "secondary" : "ghost"}
              className="h-7 px-2.5 text-xs"
              onClick={() => {
                setChannel(isActive ? null : option.value);
              }}
            >
              {option.label}
            </Button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        {platformMeta && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/10 px-2 py-0.5 font-medium">
            {platformMeta.icon && <platformMeta.icon className="h-2.5 w-2.5" />}
            {platformMeta.label}
          </span>
        )}
        <span>
          {isSyncing ? (
            <span className="inline-flex items-center gap-1 text-foreground">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Syncing…
            </span>
          ) : (
            `${totalCount} conversations`
          )}
        </span>
      </div>
    </section>
  );
}
