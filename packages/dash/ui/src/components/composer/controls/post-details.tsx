import { Button } from "@openpromo/ui/components/button";
import {
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Smile,
} from "lucide-react";
import { useComposerStore } from "@/stores/composer-store";
import ComposerMentions from "./detail/composer-mentions";
import { ComposerEmojiPicker } from "./detail/emoji-picker";

export function PostDetails() {
  const { getCurrentMessage, setCurrentMessage } = useComposerStore();

  const handleEmojiSelect = (emoji: string) => {
    const currentMessage = getCurrentMessage();
    setCurrentMessage(currentMessage + emoji);
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Text</h3>
      </div>

      {/* Text Editor */}
      <div className="border rounded-lg">
        <ComposerMentions
          value={getCurrentMessage()}
          onChange={setCurrentMessage}
        />
        <div className="border-t p-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 px-2">
              #
            </Button>
            <ComposerEmojiPicker onEmojiSelect={handleEmojiSelect} />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title="Feeling/activity"
        >
          <Smile className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title="Location"
        >
          <MapPin className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title="Get messages"
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title="Get calls"
        >
          <Phone className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title="More features"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
