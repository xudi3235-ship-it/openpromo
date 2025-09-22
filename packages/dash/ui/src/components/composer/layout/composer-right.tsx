import { Button } from "@openpromo/ui/components/button";
import { Grid3X3, List } from "lucide-react";
import { useEffect, useState } from "react";
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
  } = useComposerStore();
  const [viewMode, setViewMode] = useState<ViewMode>("collage");

  // Helper to determine if content should be shown as a reel
  const isReelContent = () => {
    const attachments = contentCreateData.base.attachments ?? [];
    return attachments.length === 1 && attachments[0]?.type === "video";
  };

  // Get selected accounts by platform
  const selectedAccountsByPlatform = accounts
    .filter((account) => selectedAccounts.includes(account.id))
    .reduce(
      (acc, account) => {
        acc[account.platform] = [...(acc[account.platform] || []), account];
        return acc;
      },
      {} as Record<string, typeof accounts>,
    );

  const hasFacebookAccounts = selectedAccountsByPlatform.FACEBOOK?.length > 0;
  const hasInstagramAccounts = selectedAccountsByPlatform.INSTAGRAM?.length > 0;

  // Auto-adjust selectedPreview based on available accounts
  useEffect(() => {
    if (
      selectedPreview === "FACEBOOK" &&
      !hasFacebookAccounts &&
      hasInstagramAccounts
    ) {
      setSelectedPreview("INSTAGRAM");
    } else if (
      selectedPreview === "INSTAGRAM" &&
      !hasInstagramAccounts &&
      hasFacebookAccounts
    ) {
      setSelectedPreview("FACEBOOK");
    }
  }, [
    selectedPreview,
    hasFacebookAccounts,
    hasInstagramAccounts,
    setSelectedPreview,
  ]);

  // Use default state when no accounts selected (show both FB + IG)
  const showFacebookPreview =
    hasFacebookAccounts || (!hasFacebookAccounts && !hasInstagramAccounts);
  const showInstagramPreview =
    hasInstagramAccounts || (!hasFacebookAccounts && !hasInstagramAccounts);

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
            showFacebook={showFacebookPreview}
            showInstagram={showInstagramPreview}
            isReel={isReelContent()}
          />
        ) : (
          <ListView
            selectedPreview={selectedPreview}
            onSelectPreview={setSelectedPreview}
            showFacebook={showFacebookPreview}
            showInstagram={showInstagramPreview}
            isReel={isReelContent()}
          />
        )}
      </div>
    </div>
  );
}
