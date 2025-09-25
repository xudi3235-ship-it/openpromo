import type { Platform } from "@core/schemas/connected-account.sql";
import { FBFeedPreview } from "@/components/composer/preview/fb-feed-preview";
import { FBReelPreview } from "@/components/composer/preview/fb-reel-preview";
import { IGFeedPreview } from "@/components/composer/preview/ig-feed-preview";
import { IGReelPreview } from "@/components/composer/preview/ig-reel-preview";
import { TikTokPreview } from "@/components/composer/preview/tiktok-preview";
import { PlatformSelector } from "./platform-selector";

interface ListViewProps {
  selectedPreview: Platform;
  onSelectPreview: (platform: Platform) => void;
  showFacebook: boolean;
  showInstagram: boolean;
  showTikTok: boolean;
  isReel: boolean;
}

export function ListView({
  selectedPreview,
  onSelectPreview,
  showFacebook,
  showInstagram,
  showTikTok,
  isReel,
}: ListViewProps) {
  const FacebookPreview = isReel ? FBReelPreview : FBFeedPreview;
  const InstagramPreview = isReel ? IGReelPreview : IGFeedPreview;
  const TikTokFeedPreview = TikTokPreview;

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Platform Selector */}
      <PlatformSelector
        selectedPreview={selectedPreview}
        onSelectPreview={onSelectPreview}
        showFacebook={showFacebook}
        showInstagram={showInstagram}
        showTikTok={showTikTok}
      />

      {/* Preview */}
      <div>
        {selectedPreview === "FACEBOOK" && showFacebook && <FacebookPreview />}
        {selectedPreview === "INSTAGRAM" && showInstagram && (
          <InstagramPreview />
        )}
        {selectedPreview === "TIKTOK" && showTikTok && <TikTokFeedPreview />}
      </div>
    </div>
  );
}
