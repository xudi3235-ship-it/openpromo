import {
  FacebookFeedPreview,
  InstagramFeedPreview,
  InstagramReelPreview,
  type PreviewData,
  TikTokFeedPreview,
} from "@openpromo/ui/components/social-preview";
import { Bug } from "lucide-react";
import { useState } from "react";
import { FBFeedPreview } from "@/components/composer/preview/fb-feed-preview";
import { FBReelPreview } from "@/components/composer/preview/fb-reel-preview";
import { IGFeedPreview } from "@/components/composer/preview/ig-feed-preview";
import { IGReelPreview } from "@/components/composer/preview/ig-reel-preview";
import { TikTokPreview } from "@/components/composer/preview/tiktok-preview";
import type { ConnectedAccount } from "@/lib/hono-client";
import { PreviewItem } from "./preview-item";

// Fake data for dev mode testing
const DEV_FAKE_DATA: PreviewData = {
  accountName: "openpromo.app",
  profilePicUrl: "https://picsum.photos/seed/profile/100/100",
  caption:
    "Excited to share our latest feature! Check out the new social preview component for your content. #openpromo #socialmedia",
  media: [
    { type: "photo", url: "https://picsum.photos/seed/post1/800/800" },
    { type: "photo", url: "https://picsum.photos/seed/post2/800/800" },
  ],
  location: "San Francisco, CA",
  timestamp: "2 hours ago",
  metrics: { likes: 1234, comments: 42, shares: 18 },
  firstComment: "This looks amazing! Can't wait to try it out.",
};

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
  const [devMode, setDevMode] = useState(false);
  const previewCount = accounts.length;

  // Dev mode: show all platform previews with fake data
  if (import.meta.env.DEV && devMode) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setDevMode(false)}
          className="absolute top-0 right-4 z-10 p-1.5 rounded bg-orange-500 text-white text-xs flex items-center gap-1"
          title="Exit dev mode"
        >
          <Bug className="w-3 h-3" />
          <span>DEV ON</span>
        </button>
        <div className="mx-auto flex flex-wrap justify-center items-start gap-6 lg:gap-8 px-4 max-w-[1200px]">
          {/* Facebook Feed */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground">FB Feed</span>
            <FacebookFeedPreview data={DEV_FAKE_DATA} size="default" />
          </div>
          {/* Instagram Feed */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground">IG Feed</span>
            <InstagramFeedPreview data={DEV_FAKE_DATA} size="default" />
          </div>
          {/* Instagram Reel */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground">IG Reel</span>
            <InstagramReelPreview data={DEV_FAKE_DATA} size="default" />
          </div>
          {/* TikTok */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground">TikTok</span>
            <TikTokFeedPreview data={DEV_FAKE_DATA} size="default" />
          </div>
        </div>
      </div>
    );
  }

  if (previewCount === 0) {
    return (
      <div className="relative flex justify-center items-center min-h-48 text-muted-foreground">
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => setDevMode(true)}
            className="absolute top-0 right-4 z-10 p-1.5 rounded bg-muted text-muted-foreground text-xs flex items-center gap-1 hover:bg-muted/80"
            title="Toggle dev mode"
          >
            <Bug className="w-3 h-3" />
          </button>
        )}
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
      default:
        return <TikTokPreview accountId={account.id} />;
    }
  };

  return (
    <div className="relative">
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={() => setDevMode(true)}
          className="absolute top-0 right-4 z-10 p-1.5 rounded bg-muted text-muted-foreground text-xs flex items-center gap-1 hover:bg-muted/80"
          title="Toggle dev mode"
        >
          <Bug className="w-3 h-3" />
        </button>
      )}
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
    </div>
  );
}
