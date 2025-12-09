import { Button } from "@openpromo/ui/components/button";
import { Grid2X2, List } from "lucide-react";
import { useEffect, useState } from "react";
import { GridView } from "@/components/composer/layout/grid-view";
import { ListView } from "@/components/composer/layout/list-view";
import type { RunFeedItem } from "@/features/instant-ad/instant-ad-types";
import { useRunAttachments } from "@/hooks/useRunAttachments";
import { useConnectedAccounts } from "@/queries/connected-account";
import { useComposerStore } from "@/stores/composer-store";

interface RunPreviewProps {
  run: RunFeedItem;
  className?: string;
  size?: "default" | "compact" | "large";
}

export function RunPreview({
  run,
  className,
  size = "large",
}: RunPreviewProps) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const { accounts, isPending: isLoadingAccounts } = useConnectedAccounts();
  const { initializeComposer, activeAccount, setActiveAccount } =
    useComposerStore();

  const { attachments, isVideo, hasMedia } = useRunAttachments(run);

  // Initialize composer store with run data when component mounts
  useEffect(() => {
    if (hasMedia) {
      initializeComposer({
        initContentCreateData: {
          base: {
            attachments,
            message: run.input?.prompt || "",
          },
          placements: {},
        },
        initialAccounts: accounts,
        initialSelectedPreview: accounts[0]?.platform,
      });
    }
  }, [run, attachments, hasMedia, accounts, initializeComposer]);

  if (isLoadingAccounts) {
    return <div className={className}>Loading preview...</div>;
  }

  if (accounts.length === 0) {
    return <div className={className}>No connected accounts for preview</div>;
  }

  // Show all connected accounts
  return (
    <div className={className}>
      {/* View Toggle */}
      <div className="flex items-center justify-center gap-1 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode("list")}
          className={`h-8 w-8 p-0 ${viewMode === "list" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <List size={16} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode("grid")}
          className={`h-8 w-8 p-0 ${viewMode === "grid" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Grid2X2 size={16} />
        </Button>
      </div>

      {/* Preview Content */}
      {viewMode === "list" ? (
        <ListView
          accounts={accounts}
          selectedAccountId={activeAccount || accounts[0]?.id}
          onSelectAccount={setActiveAccount}
          activeAccountId={null}
          isReel={Boolean(isVideo)}
        />
      ) : (
        <GridView
          accounts={accounts}
          activeAccountId={null}
          isReel={Boolean(isVideo)}
          size={size}
        />
      )}
    </div>
  );
}
