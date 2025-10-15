import { Button } from "@openpromo/ui/components/button";
import { cn } from "@openpromo/ui/lib/utils";
import { FBFeedPreview } from "@/components/composer/preview/fb-feed-preview";
import { FBReelPreview } from "@/components/composer/preview/fb-reel-preview";
import { IGFeedPreview } from "@/components/composer/preview/ig-feed-preview";
import { IGReelPreview } from "@/components/composer/preview/ig-reel-preview";
import { TikTokPreview } from "@/components/composer/preview/tiktok-preview";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import type { ConnectedAccount } from "@/lib/hono-client";
import { PreviewItem } from "./preview-item";

interface AccountSelectorProps {
  accounts: ConnectedAccount[];
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string) => void;
  activeAccountId: string | null;
}

function AccountSelector({
  accounts,
  selectedAccountId,
  onSelectAccount,
  activeAccountId,
}: AccountSelectorProps) {
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {accounts.map((account) => {
        const meta = getPlatformMeta(account.platform);
        const Icon = meta.icon;
        const isSelected = selectedAccountId === account.id;
        const isActive = activeAccountId === account.id;
        const accountLabel = account.accountName || meta.label;

        return (
          <Button
            key={account.id}
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3 flex items-center gap-2 text-xs",
              isSelected && "bg-accent text-accent-foreground",
            )}
            onClick={() => onSelectAccount(account.id)}
          >
            <Icon className={cn("h-3.5 w-3.5", meta.accentTextClass)} />
            <span className="max-w-[120px] truncate" title={accountLabel}>
              {accountLabel}
            </span>
            {isActive && (
              <span className="text-[10px] text-muted-foreground">
                (custom)
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}

interface ListViewProps {
  accounts: ConnectedAccount[];
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string) => void;
  activeAccountId: string | null;
  isReel: boolean;
}

export function ListView({
  accounts,
  selectedAccountId,
  onSelectAccount,
  activeAccountId,
  isReel,
}: ListViewProps) {
  if (accounts.length === 0) {
    return (
      <div className="max-w-md mx-auto text-sm text-muted-foreground text-center p-6">
        Connect and enable an account to preview your post.
      </div>
    );
  }

  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) || accounts[0];

  if (!selectedAccount) {
    return (
      <div className="max-w-md mx-auto text-sm text-muted-foreground text-center p-6">
        No account selected.
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
    <div className="mx-auto space-y-4 flex flex-col items-center">
      <AccountSelector
        accounts={accounts}
        selectedAccountId={selectedAccount.id}
        onSelectAccount={onSelectAccount}
        activeAccountId={activeAccountId}
      />

      <PreviewItem
        account={selectedAccount}
        contentType={
          selectedAccount.platform === "TIKTOK"
            ? "feed"
            : isReel
              ? "reel"
              : "feed"
        }
        isActive={selectedAccount.id === activeAccountId}
      >
        {renderPreview(selectedAccount)}
      </PreviewItem>
    </div>
  );
}
