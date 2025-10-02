import { Button } from "@openpromo/ui/components/button";
import { Grid3X3, List } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useComposerStore } from "@/stores/composer-store";
import { CollageView } from "./collage-view";
import { ListView } from "./list-view";

type ViewMode = "collage" | "list";

export function ComposerRight() {
  const {
    selectedPreview,
    setSelectedPreview,
    contentCreateData,
    accounts,
    selectedAccounts,
    activeAccount,
  } = useComposerStore();
  const [viewMode, setViewMode] = useState<ViewMode>("collage");

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  // Helper to determine if content should be shown as a reel
  const isReelContent = () => {
    const attachments = contentCreateData.base.attachments ?? [];
    return attachments.length === 1 && attachments[0]?.type === "video";
  };

  const previewAccounts = useMemo(() => {
    const orderedSelected = selectedAccounts
      .map((id) => accounts.find((account) => account.id === id))
      .filter((account): account is (typeof accounts)[number] =>
        Boolean(account),
      );

    if (orderedSelected.length > 0) {
      return orderedSelected;
    }

    return accounts;
  }, [accounts, selectedAccounts]);

  useEffect(() => {
    if (previewAccounts.length === 0) {
      if (selectedAccountId !== null) {
        setSelectedAccountId(null);
      }
      return;
    }

    const findAccount = (id?: string | null) =>
      previewAccounts.find((account) => account.id === id);

    const preferredAccount =
      findAccount(activeAccount) ||
      findAccount(selectedAccountId) ||
      previewAccounts[0];

    if (selectedAccountId !== preferredAccount.id) {
      setSelectedAccountId(preferredAccount.id);
    }

    if (selectedPreview !== preferredAccount.platform) {
      setSelectedPreview(preferredAccount.platform);
    }
  }, [
    previewAccounts,
    activeAccount,
    selectedAccountId,
    selectedPreview,
    setSelectedPreview,
  ]);

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    const account = accounts.find((acc) => acc.id === accountId);
    if (account) {
      setSelectedPreview(account.platform);
    }
  };

  return (
    <div className="h-full p-4 bg-background overflow-y-auto">
      <div className="space-y-4">
        {/* Preview Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Preview</h3>
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === "collage" ? "default" : "ghost"}
              size="sm"
              className="rounded-r-none h-8 px-2"
              onClick={() => setViewMode("collage")}
              title="Collage view"
            >
              <Grid3X3 className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-l-none h-8 px-2"
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <List className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Platform Previews */}
        {viewMode === "collage" ? (
          <CollageView
            accounts={previewAccounts}
            activeAccountId={activeAccount}
            isReel={isReelContent()}
          />
        ) : (
          <ListView
            accounts={previewAccounts}
            selectedAccountId={selectedAccountId}
            onSelectAccount={handleSelectAccount}
            activeAccountId={activeAccount}
            isReel={isReelContent()}
          />
        )}
      </div>
    </div>
  );
}
