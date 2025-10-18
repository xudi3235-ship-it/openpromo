import { Button } from "@openpromo/ui/components/button";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import type { InboxChannel } from "@/stores/inbox/types";
import { useInboxStore } from "@/stores/inbox-store";

interface ChannelOption {
  value: InboxChannel | null;
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
  const selectedChannel = useInboxStore((state) => state.selectedChannel);
  const setChannel = useInboxStore((state) => state.setChannel);
  const selectedPlatform = useInboxStore((state) => state.selectedPlatform);

  const platformMeta = useMemo(() => {
    if (!selectedPlatform) return null;
    return getPlatformMeta(selectedPlatform);
  }, [selectedPlatform]);

  return (
    <section className="flex flex-col gap-2">
      <header className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Inbox</span>
        <span className="flex items-center gap-2">
          {platformMeta ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">Platform:</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/15 px-2 py-0.5 text-[11px] font-medium">
                {platformMeta.icon && <platformMeta.icon className="h-3 w-3" />}
                {platformMeta.label}
              </span>
            </span>
          ) : (
            <span className="text-xs">All platforms</span>
          )}
          <span className="text-xs">
            {isSyncing ? (
              <span className="inline-flex items-center gap-1 text-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
              </span>
            ) : (
              `${totalCount} conversations`
            )}
          </span>
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {CHANNEL_OPTIONS.map((option) => {
          const isActive = selectedChannel === option.value;
          return (
            <Button
              key={option.label}
              type="button"
              size="sm"
              variant={isActive ? "secondary" : "ghost"}
              className="px-3"
              onClick={() => setChannel(isActive ? null : option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
