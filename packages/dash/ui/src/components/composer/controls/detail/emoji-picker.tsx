import { Button } from "@openpromo/ui/components/button";
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from "@openpromo/ui/components/emoji-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@openpromo/ui/components/popover";
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
      <PopoverContent align="start" side="top">
        <EmojiPicker
          className="h-[342px]"
          onEmojiSelect={({ emoji }) => {
            handleEmojiSelect({ emoji, label: "" });
          }}
        >
          <EmojiPickerSearch />
          <EmojiPickerContent />
          <EmojiPickerFooter />
        </EmojiPicker>
      </PopoverContent>
    </Popover>
  );
}
