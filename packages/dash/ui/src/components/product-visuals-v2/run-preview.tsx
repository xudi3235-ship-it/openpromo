import React from "react";
import { ListView } from "@/components/composer/layout/list-view";
import type { RunFeedItem } from "@/features/product-visuals-v2/product-visuals-types";
import { useConnectedAccounts } from "@/queries/connected-account";
import { useComposerStore } from "@/stores/composer-store";

interface RunPreviewProps {
  run: RunFeedItem;
  className?: string;
}

export function RunPreview({ run, className }: RunPreviewProps) {
  const { accounts, isPending: isLoadingAccounts } = useConnectedAccounts();
  const { initializeComposer, activeAccount, setActiveAccount } =
    useComposerStore();

  // Get media from run
  const isVideo = run.output.output?.videos?.[0] || run.artifacts?.videos?.[0];
  const mediaUrl =
    isVideo?.videoUrl ||
    run.output.output?.images?.[0]?.imageUrl ||
    run.artifacts?.images?.[0]?.imageUrl;

  // Initialize composer store with run data when component mounts
  React.useEffect(() => {
    if (mediaUrl) {
      initializeComposer({
        initContentCreateData: {
          base: {
            attachments: [
              {
                id: run.id,
                type: isVideo ? "video" : "photo",
                publicUrl: mediaUrl,
                mimeType: isVideo ? "video/mp4" : "image/jpeg",
                source: "remote" as const,
              },
            ],
            message: run.input?.prompt || "",
          },
          placements: {},
        },
        initialAccounts: accounts,
        initialSelectedPreview: accounts[0]?.platform,
      });
    }
  }, [run, mediaUrl, isVideo, accounts, initializeComposer]);

  if (isLoadingAccounts) {
    return <div className={className}>Loading preview...</div>;
  }

  if (accounts.length === 0) {
    return <div className={className}>No connected accounts for preview</div>;
  }

  // Show all connected accounts
  return (
    <div className={className}>
      <ListView
        accounts={accounts}
        selectedAccountId={activeAccount || accounts[0]?.id}
        onSelectAccount={setActiveAccount}
        activeAccountId={null}
        isReel={Boolean(isVideo)}
      />
    </div>
  );
}
