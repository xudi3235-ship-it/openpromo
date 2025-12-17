import { Button } from "@openpromo/ui/components/button";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@openpromo/ui/components/tooltip";
import { cn } from "@openpromo/ui/lib/utils";
import { Grid3X3, List } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useComposerStore } from "@/stores/composer-store";
import { CollageView } from "./collage-view";
import { ListView } from "./list-view";

type ViewMode = "collage" | "list";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <TooltipProvider>
      <div className="flex gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2",
                viewMode === "collage" && "bg-accent text-accent-foreground",
              )}
              onClick={() => onViewModeChange("collage")}
            >
              <Grid3X3 className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Collage view</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2",
                viewMode === "list" && "bg-accent text-accent-foreground",
              )}
              onClick={() => onViewModeChange("list")}
            >
              <List className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>List view</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

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
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Fixed header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <h3 className="text-sm font-medium text-foreground">Preview</h3>
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Scrollable content */}
      <ScrollArea className="min-h-0 flex-1" feather>
        <div className="px-4 pt-2 pb-4">
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
      </ScrollArea>
    </div>
  );
}
