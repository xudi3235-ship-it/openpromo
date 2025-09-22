import type { Platform } from "@core/schemas/connected-account.sql";
import { FBFeedPreview } from "@/components/composer/preview/fb-feed-preview";
import { FBReelPreview } from "@/components/composer/preview/fb-reel-preview";
import { IGFeedPreview } from "@/components/composer/preview/ig-feed-preview";
import { IGReelPreview } from "@/components/composer/preview/ig-reel-preview";
import { PlatformSelector } from "./platform-selector";

interface ListViewProps {
  selectedPreview: Platform;
  onSelectPreview: (platform: Platform) => void;
  showFacebook: boolean;
  showInstagram: boolean;
  isReel: boolean;
}

export function ListView({
  selectedPreview,
  onSelectPreview,
  showFacebook,
  showInstagram,
  isReel,
}: ListViewProps) {
  const FacebookPreview = isReel ? FBReelPreview : FBFeedPreview;
  const InstagramPreview = isReel ? IGReelPreview : IGFeedPreview;

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Platform Selector */}
      <PlatformSelector
        selectedPreview={selectedPreview}
        onSelectPreview={onSelectPreview}
        showFacebook={showFacebook}
        showInstagram={showInstagram}
      />

      {/* Preview */}
      <div>
        {selectedPreview === "FACEBOOK" && showFacebook && <FacebookPreview />}
        {selectedPreview === "INSTAGRAM" && showInstagram && (
          <InstagramPreview />
        )}
      </div>
    </div>
  );
}
