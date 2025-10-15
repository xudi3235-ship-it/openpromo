import { FBFeedPreview } from "@/components/composer/preview/fb-feed-preview";
import { FBReelPreview } from "@/components/composer/preview/fb-reel-preview";
import { IGFeedPreview } from "@/components/composer/preview/ig-feed-preview";
import { IGReelPreview } from "@/components/composer/preview/ig-reel-preview";
import { TikTokPreview } from "@/components/composer/preview/tiktok-preview";
import type { ConnectedAccount } from "@/lib/hono-client";
import { PreviewItem } from "./preview-item";

interface CollageViewProps {
  accounts: ConnectedAccount[];
  activeAccountId: string | null;
  isReel: boolean;
}

export function CollageView({
  accounts,
  activeAccountId,
  isReel,
}: CollageViewProps) {
  const previewCount = accounts.length;

  if (previewCount === 0) {
    return (
      <div className="flex justify-center items-center min-h-48 text-muted-foreground">
        <div className="text-sm">Connect an account to see a live preview.</div>
      </div>
    );
  }

  const renderPreview = (account: ConnectedAccount) => {
    switch (account.platform) {
      case "FACEBOOK": {
        const Component = isReel ? FBReelPreview : FBFeedPreview;
        return <Component accountId={account.id} />;
      }
      case "INSTAGRAM": {
        const Component = isReel ? IGReelPreview : IGFeedPreview;
        return <Component accountId={account.id} />;
      }
      case "TIKTOK":
      default:
        return <TikTokPreview accountId={account.id} />;
    }
  };

  return (
    <div className="mx-auto flex flex-wrap justify-center items-start gap-6 lg:gap-8 px-4 max-w-[1200px]">
      {accounts.map((account) => (
        <PreviewItem
          key={account.id}
          account={account}
          contentType={
            account.platform === "TIKTOK" ? "feed" : isReel ? "reel" : "feed"
          }
          isActive={account.id === activeAccountId}
        >
          {renderPreview(account)}
        </PreviewItem>
      ))}
    </div>
  );
}
