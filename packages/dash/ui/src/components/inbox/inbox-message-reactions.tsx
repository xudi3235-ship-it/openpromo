import { Button } from "@openpromo/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openpromo/ui/components/popover";
import { cn } from "@openpromo/ui/lib/utils";
import { Smile } from "lucide-react";
import { useState } from "react";

// Common emoji reactions
const COMMON_REACTIONS = [
  "❤️",
  "👍",
  "👎",
  "😂",
  "😮",
  "😢",
  "😡",
  "🎉",
  "🔥",
  "👏",
];

interface ReactionDisplayProps {
  reactions: Array<{
    emoji: string;
    count: number;
    userReacted?: boolean;
  }>;
  onRemove?: (emoji: string) => void;
  className?: string;
}

/**
 * Display reactions from Facebook/Instagram webhooks
 * - Facebook: Read-only (API doesn't support sending reactions)
 * - Instagram: Interactive (API supports sending reactions when onRemove is provided)
 */
export function ReactionDisplay({
  reactions,
  onRemove,
  className,
}: ReactionDisplayProps) {
  if (reactions.length === 0) {
    return null;
  }

  const isInteractive = Boolean(onRemove);

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {reactions.map((reaction) => {
        const canRemove = isInteractive && reaction.userReacted;

        return isInteractive ? (
          <button
            key={reaction.emoji}
            type="button"
            onClick={() => {
              if (canRemove && onRemove) {
                onRemove(reaction.emoji);
              }
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
              canRemove
                ? "bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"
                : "bg-muted/60 text-muted-foreground cursor-default",
            )}
            disabled={!canRemove}
          >
            <span className="text-sm">{reaction.emoji}</span>
            {reaction.count > 1 && (
              <span className="font-medium">{reaction.count}</span>
            )}
          </button>
        ) : (
          <div
            key={reaction.emoji}
            className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
          >
            <span className="text-sm">{reaction.emoji}</span>
            {reaction.count > 1 && (
              <span className="font-medium">{reaction.count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ReactionPicker({
  onSelect,
  disabled = false,
  className,
}: ReactionPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100",
            className,
          )}
        >
          <Smile className="h-3.5 w-3.5" />
          <span className="sr-only">Add reaction</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        align="start"
        side="top"
        sideOffset={4}
      >
        <div className="grid grid-cols-5 gap-1">
          {COMMON_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleSelect(emoji)}
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted transition-colors text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Process reactions from message metadata into display format
 * Deduplicate by actorId + emoji to avoid showing duplicate reactions
 */
export function processReactions(
  metadata: {
    byPlatform?: Record<
      string,
      // biome-ignore lint/suspicious/noExplicitAny: dynamic platform metadata structure
      any
    >;
  } | null,
  channel: "dm" | "post_comment",
  currentUserId?: string,
): Array<{
  emoji: string;
  count: number;
  userReacted: boolean;
}> {
  if (!metadata?.byPlatform) {
    return [];
  }

  // Collect all reactions from all platforms (FACEBOOK, INSTAGRAM)
  const allReactions = Object.values(metadata.byPlatform).flatMap(
    (platformMeta) => {
      if (!platformMeta || typeof platformMeta !== "object") return [];
      const channelMeta = platformMeta[channel];
      if (!channelMeta || typeof channelMeta !== "object") return [];
      const reactions = (channelMeta as { reactions?: unknown }).reactions;
      if (!Array.isArray(reactions)) return [];
      return reactions;
    },
  );

  // Deduplicate by actorId + emoji (same user can only react once with same emoji)
  const uniqueReactions = new Map<string, { key: string; actorId: string }>();

  for (const reaction of allReactions) {
    if (!reaction || typeof reaction !== "object") continue;
    const r = reaction as { key?: string; actorId?: string; action?: string };
    const emoji = r.key;
    const actorId = r.actorId;

    if (!emoji || !actorId) continue;

    // Skip removed reactions
    if (r.action === "removed") continue;

    const dedupeKey = `${actorId}:${emoji}`;
    uniqueReactions.set(dedupeKey, { key: emoji, actorId });
  }

  // Group by emoji and count unique actors, track if current user reacted
  const reactionMap = new Map<
    string,
    { count: number; userReacted: boolean }
  >();

  for (const { key: emoji, actorId } of uniqueReactions.values()) {
    const existing = reactionMap.get(emoji) ?? { count: 0, userReacted: false };
    reactionMap.set(emoji, {
      count: existing.count + 1,
      userReacted:
        existing.userReacted ||
        (currentUserId ? actorId === currentUserId : false),
    });
  }

  // Convert to array format
  return Array.from(reactionMap.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    userReacted: data.userReacted,
  }));
}
