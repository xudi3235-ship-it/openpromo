import { FBFeedPreview } from "@/components/composer/preview/fb-feed-preview";
import { FBReelPreview } from "@/components/composer/preview/fb-reel-preview";
import { IGFeedPreview } from "@/components/composer/preview/ig-feed-preview";
import { IGReelPreview } from "@/components/composer/preview/ig-reel-preview";
import { TikTokPreview } from "@/components/composer/preview/tiktok-preview";
import { PreviewItem } from "./preview-item";

interface CollageViewProps {
  showFacebook: boolean;
  showInstagram: boolean;
  showTikTok: boolean;
  isReel: boolean;
}

export function CollageView({
  showFacebook,
  showInstagram,
  showTikTok,
  isReel,
}: CollageViewProps) {
  const FacebookPreview = isReel ? FBReelPreview : FBFeedPreview;
  const InstagramPreview = isReel ? IGReelPreview : IGFeedPreview;
  const TikTokFeedPreview = TikTokPreview;

  // Calculate the number of active previews
  const previewCount =
    (showFacebook ? 1 : 0) + (showInstagram ? 1 : 0) + (showTikTok ? 1 : 0);

  if (previewCount === 0) {
    return (
      <div className="flex justify-center items-center min-h-48 text-muted-foreground">
        <div className="text-sm">No previews available</div>
      </div>
    );
  }

  if (previewCount === 1) {
    return (
      <div className="flex justify-center">
        {showFacebook && (
          <PreviewItem
            platform="facebook"
            contentType={isReel ? "reel" : "feed"}
          >
            <FacebookPreview />
          </PreviewItem>
        )}
        {showInstagram && (
          <PreviewItem
            platform="instagram"
            contentType={isReel ? "reel" : "feed"}
          >
            <InstagramPreview />
          </PreviewItem>
        )}
        {showTikTok && (
          <PreviewItem platform="tiktok" contentType={isReel ? "reel" : "feed"}>
            <TikTokFeedPreview />
          </PreviewItem>
        )}
      </div>
    );
  }

  const gridTemplate =
    previewCount === 2
      ? "repeat(auto-fit, minmax(280px, 1fr))"
      : "repeat(auto-fit, minmax(240px, 1fr))";

  return (
    <div
      className="mx-auto grid w-full max-w-5xl gap-5 justify-items-center items-start"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      {showFacebook && (
        <PreviewItem platform="facebook" contentType={isReel ? "reel" : "feed"}>
          <FacebookPreview />
        </PreviewItem>
      )}
      {showInstagram && (
        <PreviewItem
          platform="instagram"
          contentType={isReel ? "reel" : "feed"}
        >
          <InstagramPreview />
        </PreviewItem>
      )}
      {showTikTok && (
        <PreviewItem platform="tiktok" contentType={isReel ? "reel" : "feed"}>
          <TikTokFeedPreview />
        </PreviewItem>
      )}
    </div>
  );
}
