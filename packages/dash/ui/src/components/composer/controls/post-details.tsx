import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import {
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Smile,
} from "lucide-react";
import { useMemo } from "react";
import { PLACEHOLDER, TOOLTIP, validateCaption } from "@/lib/caption-limit";
import {
  resolveHasMediaOrLink,
  resolveSelectedPlatforms,
} from "@/stores/composer/utils/caption";
import { useComposerStore } from "@/stores/composer-store";
import ComposerMentions from "./detail/composer-mentions";
import { ComposerEmojiPicker } from "./detail/emoji-picker";

const STATE_COLOR: Record<"ok" | "warn" | "error", string> = {
  ok: "text-muted-foreground",
  warn: "text-amber-500",
  error: "text-destructive",
};

export function PostDetails() {
  const composer = useComposerStore((state) => state);

  const currentMessage = composer.getCurrentMessage() ?? "";
  const selectedPlatforms = useMemo(
    () =>
      resolveSelectedPlatforms(composer.accounts, composer.selectedAccounts),
    [composer.accounts, composer.selectedAccounts],
  );
  const mediaOrLink = useMemo(
    () =>
      resolveHasMediaOrLink(
        composer.contentCreateData.base.attachments,
        composer.contentCreateData.placements.facebookFeed,
      ),
    [
      composer.contentCreateData.base.attachments,
      composer.contentCreateData.placements.facebookFeed,
    ],
  );
  const captionValidation = useMemo(
    () => validateCaption(currentMessage, selectedPlatforms, mediaOrLink),
    [currentMessage, selectedPlatforms, mediaOrLink],
  );

  const helperText = useMemo(() => {
    if (captionValidation.needsMediaForIG) {
      return "Instagram requires at least one image or video.";
    }
    if (captionValidation.overLimit) {
      return "Caption exceeds the limit for one or more platforms.";
    }
    if (captionValidation.emptyAll) {
      return "Add text or attach media to publish.";
    }
    return "Compatible with all selected platforms ✅";
  }, [
    captionValidation.emptyAll,
    captionValidation.needsMediaForIG,
    captionValidation.overLimit,
  ]);

  const counterClassName = cn(
    "text-[11px] font-medium",
    STATE_COLOR[captionValidation.state],
  );

  const helperTone =
    STATE_COLOR[
      captionValidation.overLimit ? "error" : captionValidation.state
    ];

  const handleEmojiSelect = (emoji: string) => {
    const latest = composer.getCurrentMessage() ?? "";
    composer.setCurrentMessage(latest + emoji);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Text</h3>
      </div>

      <div className="border rounded-lg">
        <ComposerMentions
          value={currentMessage}
          onChange={composer.setCurrentMessage}
          placeholder={PLACEHOLDER}
        />
        <div className="border-t p-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-6 px-2">
                #
              </Button>
              <ComposerEmojiPicker onEmojiSelect={handleEmojiSelect} />
            </div>
            <span className={counterClassName} title={TOOLTIP}>
              {captionValidation.len.toLocaleString()} /{" "}
              {captionValidation.limit.toLocaleString()}
            </span>
          </div>
          <p
            className={`text-xs ${helperTone}`}
            aria-live="polite"
            role="status"
          >
            {helperText}
          </p>
        </div>
      </div>

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
