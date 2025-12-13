import { Button } from "@openpromo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { format } from "date-fns";
import { useMemo } from "react";
import { MdPublish, MdSaveAlt, MdSchedule } from "react-icons/md";
import { useComposerStore } from "@/stores/composer-store";
import { CollageView } from "../layout/collage-view";

type ActionType = "draft" | "publish" | "schedule";

interface ContentConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  actionType: ActionType;
  isPending?: boolean;
}

export function ContentConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  actionType,
  isPending = false,
}: ContentConfirmationDialogProps) {
  const { contentCreateData, accounts, selectedAccounts, activeAccount } =
    useComposerStore();
  const { publishingStatus, schedulingSpec, message } = contentCreateData.base;

  const isScheduled = publishingStatus === "SCHEDULED";
  const publishTime = isScheduled
    ? schedulingSpec?.publishAt
      ? new Date(schedulingSpec.publishAt)
      : null
    : null;

  // Determine if it's a reel based on attachments
  const isReel = useMemo(() => {
    const attachments = contentCreateData.base.attachments ?? [];
    return attachments.length === 1 && attachments[0]?.type === "video";
  }, [contentCreateData.base.attachments]);

  // Get preview accounts (same logic as ComposerRight)
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

  const getTitle = () => {
    switch (actionType) {
      case "draft":
        return "Review and save as draft";
      case "schedule":
        return "Review and schedule post";
      case "publish":
        return "Review and publish post";
    }
  };

  const getButtonLabel = () => {
    if (isPending) {
      switch (actionType) {
        case "draft":
          return "Saving draft...";
        case "schedule":
          return "Scheduling...";
        case "publish":
          return "Publishing...";
      }
    }
    switch (actionType) {
      case "draft":
        return "Confirm & save draft";
      case "schedule":
        return "Confirm & schedule";
      case "publish":
        return "Confirm & publish";
    }
  };

  const getButtonIcon = () => {
    switch (actionType) {
      case "draft":
        return <MdSaveAlt className="h-4 w-4" />;
      case "schedule":
        return <MdSchedule className="h-4 w-4" />;
      case "publish":
        return <MdPublish className="h-4 w-4" />;
    }
  };

  const getInfoMessage = () => {
    switch (actionType) {
      case "draft":
        return "This draft will be saved and you can continue editing it later. You can publish it anytime from your drafts.";
      case "schedule":
        return publishTime
          ? `This post will be automatically published on ${format(
              publishTime,
              "MMM d, yyyy 'at' h:mm a",
            )}. You'll receive a notification once it goes live.`
          : null;
      case "publish":
        return "This post will be immediately published to your selected accounts.";
    }
  };

  const buttonVariant = "default";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[70vw] min-w-[900px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 py-3 flex-shrink-0">
          <DialogTitle className="text-base font-semibold">
            {getTitle()}
          </DialogTitle>
          {getInfoMessage() && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {getInfoMessage()}
            </p>
          )}
        </DialogHeader>

        {/* Content - Scrollable */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 p-5">
            {/* Preview Section */}
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Preview
              </h3>
              <div className="flex justify-center py-2">
                {previewAccounts.length > 0 ? (
                  <CollageView
                    accounts={previewAccounts}
                    activeAccountId={activeAccount}
                    isReel={isReel}
                  />
                ) : (
                  <div className="text-center text-xs text-muted-foreground">
                    Connect an account to see a preview.
                  </div>
                )}
              </div>
            </div>

            {/* Caption Section */}
            {message && (
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Caption
                </h3>
                <p className="text-xs text-foreground line-clamp-3">
                  {message}
                </p>
              </div>
            )}

            {/* Publish Time Section */}
            {(actionType === "schedule" || actionType === "publish") &&
              publishTime && (
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Publish time
                  </h3>
                  <p className="text-xs text-foreground font-medium">
                    {format(publishTime, "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-5 py-2 gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
            className="gap-2"
            variant={buttonVariant}
          >
            {getButtonIcon()}
            <span>{getButtonLabel()}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
