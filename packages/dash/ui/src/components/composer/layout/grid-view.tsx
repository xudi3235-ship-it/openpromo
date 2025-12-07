import { FBFeedPreview } from "@/components/composer/preview/fb-feed-preview";
import { FBReelPreview } from "@/components/composer/preview/fb-reel-preview";
import { IGFeedPreview } from "@/components/composer/preview/ig-feed-preview";
import { IGReelPreview } from "@/components/composer/preview/ig-reel-preview";
import { TikTokPreview } from "@/components/composer/preview/tiktok-preview";
import type { ConnectedAccount } from "@/lib/hono-client";
import { PreviewItem } from "./preview-item";

interface GridViewProps {
  accounts: ConnectedAccount[];
  activeAccountId: string | null;
  isReel: boolean;
}

export function GridView({ accounts, activeAccountId, isReel }: GridViewProps) {
  if (accounts.length === 0) {
    return (
      <div className="max-w-md mx-auto text-sm text-muted-foreground text-center p-6">
        Connect and enable an account to preview your post.
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
      default:
        return <TikTokPreview accountId={account.id} />;
    }
  };

  return (
    <div className="mx-auto flex flex-wrap justify-center gap-4 items-start">
      {accounts.map((account) => (
        <PreviewItem
          key={account.id}
          account={account}
          contentType={
            account.platform === "TIKTOK" ? "feed" : isReel ? "reel" : "feed"
          }
          isActive={account.id === activeAccountId}
          size="compact"
        >
          {renderPreview(account)}
        </PreviewItem>
      ))}
    </div>
  );
}
