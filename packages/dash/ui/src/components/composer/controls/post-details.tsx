import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { AlertCircle, ImageIcon, InfoIcon } from "lucide-react";
import { useMemo } from "react";
import { PLACEHOLDER, TOOLTIP, validateCaption } from "@/lib/caption-limit";
import {
  resolveHasMediaOrLink,
  resolveSelectedPlatforms,
} from "@/stores/composer/utils/caption";
import { useComposerStore } from "@/stores/composer-store";
import ComposerMentions from "./detail/composer-mentions";
import { ComposerEmojiPicker } from "./detail/emoji-picker";
import { PlatformFeaturesSection } from "./platform-features/platform-features-section";
import { VideoThumbnailSection } from "./video-thumbnail/video-thumbnail-section";

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

  const helperBanner = useMemo(() => {
    if (captionValidation.needsMediaForIG) {
      return {
        icon: ImageIcon,
        message: "Instagram requires at least one image or video",
        variant: "info" as const,
      };
    }
    if (captionValidation.overLimit) {
      return {
        icon: AlertCircle,
        message: "Caption exceeds the limit for one or more platforms",
        variant: "error" as const,
      };
    }
    if (captionValidation.emptyAll) {
      return {
        icon: InfoIcon,
        message: "Add text or attach media to publish",
        variant: "muted" as const,
      };
    }
    return null;
  }, [
    captionValidation.emptyAll,
    captionValidation.needsMediaForIG,
    captionValidation.overLimit,
  ]);

  const counterClassName = cn(
    "text-[11px] font-medium",
    captionValidation.overLimit
      ? "text-destructive"
      : captionValidation.len >= Math.floor(captionValidation.limit * 0.9)
        ? "text-amber-600 dark:text-amber-500"
        : "text-muted-foreground",
  );

  const handleEmojiSelect = (emoji: string) => {
    const latest = composer.getCurrentMessage() ?? "";
    composer.setCurrentMessage(latest + emoji);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Text</h3>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <ComposerMentions
          value={currentMessage}
          onChange={composer.setCurrentMessage}
          placeholder={PLACEHOLDER}
        />

        {/* Apple-style compact info banner */}
        {helperBanner && (
          <div
            className={cn(
              "px-3 py-2 flex items-center gap-2 text-xs border-t transition-colors",
              helperBanner.variant === "error"
                ? "bg-red-50/80 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/30"
                : "bg-muted/50 border-border",
            )}
            role="status"
            aria-live="polite"
          >
            <helperBanner.icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                helperBanner.variant === "error"
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "flex-1 font-medium",
                helperBanner.variant === "error"
                  ? "text-red-900 dark:text-red-100"
                  : "text-muted-foreground",
              )}
            >
              {helperBanner.message}
            </span>
          </div>
        )}

        <div className="border-t p-2 flex items-center justify-between">
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
      </div>

      <PlatformFeaturesSection />
      <VideoThumbnailSection />
    </div>
  );
}
