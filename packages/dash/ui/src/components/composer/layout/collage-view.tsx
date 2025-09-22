import { FBFeedPreview } from "@/components/composer/preview/fb-feed-preview";
import { FBReelPreview } from "@/components/composer/preview/fb-reel-preview";
import { IGFeedPreview } from "@/components/composer/preview/ig-feed-preview";
import { IGReelPreview } from "@/components/composer/preview/ig-reel-preview";
import { PreviewItem } from "./preview-item";

interface CollageViewProps {
  showFacebook: boolean;
  showInstagram: boolean;
  isReel: boolean;
}

export function CollageView({
  showFacebook,
  showInstagram,
  isReel,
}: CollageViewProps) {
  const FacebookPreview = isReel ? FBReelPreview : FBFeedPreview;
  const InstagramPreview = isReel ? IGReelPreview : IGFeedPreview;

  // Calculate the number of active previews
  const previewCount = (showFacebook ? 1 : 0) + (showInstagram ? 1 : 0);

  // Dynamic layout classes based on preview count
  const getLayoutClasses = () => {
    if (previewCount === 0) {
      // No previews (defensive case)
      return "flex justify-center items-center min-h-48";
    } else if (previewCount === 1) {
      // Single preview: center it with optimal width
      return "flex justify-center items-start";
    } else {
      // Multiple previews: responsive grid with better spacing
      return "mx-auto grid max-w-6xl grid-cols-1 gap-6 justify-items-center md:grid-cols-2 md:gap-8 lg:gap-10";
    }
  };

  return (
    <div className={getLayoutClasses()}>
      {previewCount === 0 ? (
        <div className="text-center text-muted-foreground">
          <div className="text-sm">No previews available</div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
