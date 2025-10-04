"use client";

import { Button } from "@openpromo/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openpromo/ui/components/popover";
import { EmojiPicker } from "frimousse";
import { Smile } from "lucide-react";
import { useState } from "react";

interface ComposerEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function ComposerEmojiPicker({
  onEmojiSelect,
}: ComposerEmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiSelect = (emoji: { emoji: string; label: string }) => {
    onEmojiSelect(emoji.emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2" type="button">
          <Smile className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[352px] p-0 border-border"
        align="start"
        side="top"
        sideOffset={8}
      >
        <EmojiPicker.Root
          onEmojiSelect={handleEmojiSelect}
          className="flex flex-col"
        >
          <div className="p-2 border-b border-border">
            <EmojiPicker.Search
              placeholder="Search emoji..."
              className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <EmojiPicker.Viewport className="h-[320px] overflow-y-auto">
            <EmojiPicker.Loading>
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Loading…
              </div>
            </EmojiPicker.Loading>
            <EmojiPicker.Empty>
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No emoji found.
              </div>
            </EmojiPicker.Empty>
            <EmojiPicker.List className="p-2 [&_[frimousse-group]]:mb-4 [&_[frimousse-group-label]]:text-xs [&_[frimousse-group-label]]:font-semibold [&_[frimousse-group-label]]:text-muted-foreground [&_[frimousse-group-label]]:mb-2 [&_[frimousse-group-content]]:grid [&_[frimousse-group-content]]:grid-cols-8 [&_[frimousse-group-content]]:gap-1 [&_[frimousse-emoji-button]]:w-full [&_[frimousse-emoji-button]]:aspect-square [&_[frimousse-emoji-button]]:flex [&_[frimousse-emoji-button]]:items-center [&_[frimousse-emoji-button]]:justify-center [&_[frimousse-emoji-button]]:text-xl [&_[frimousse-emoji-button]]:rounded [&_[frimousse-emoji-button]]:hover:bg-accent [&_[frimousse-emoji-button]]:transition-colors" />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </PopoverContent>
    </Popover>
  );
}
