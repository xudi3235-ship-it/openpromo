import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { useState } from "react";
import { useComposerDialogLifecycle } from "@/hooks/composer/useComposerHooks";
import { useComposerStore } from "@/stores/composer-store";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";
import { CancelConfirmationDialog } from "../dialogs/cancel-confirmation-dialog";
import { ComposerErrorState } from "../layout/composer-error-state";
import { ComposerLeft } from "../layout/composer-left";
import { ComposerRight } from "../layout/composer-right";
import { ComposerSkeleton } from "../layout/composer-skeleton";
import { TwoColumnLayout } from "../layout/two-column-layout";

export default function ComposerDialog() {
  const {
    mode,
    closeComposer,
    pendingContentGroupID,
    initialContentCreateData,
  } = useDialogComposerStore();
  const hasUnsavedChanges = useComposerStore((s) => s.hasUnsavedChanges);
  const resetComposer = useComposerStore((s) => s.resetComposer);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const isOpen = mode === "dialog";
  const { isPending, contentGroupIsError } = useComposerDialogLifecycle({
    mode,
    pendingContentGroupID,
    initialContentCreateData,
  });

  const handleRetry = () => {
    // Refetch can be handled via query client invalidation
    // For now, we'll close and reopen, but you could also add refetch callback
    closeComposer();
    if (pendingContentGroupID) {
      useDialogComposerStore.getState().openDialog(pendingContentGroupID);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // User is trying to close the dialog (clicking outside, pressing Escape, or X button)
      // Only check for unsaved changes if the dialog wasn't already being closed programmatically
      // (i.e., mode is still "dialog" meaning this is a user-initiated close)
      if (mode === "dialog" && hasUnsavedChanges()) {
        // Show confirmation dialog
        setShowCancelConfirm(true);
      } else if (mode === "dialog") {
        // No unsaved changes, close immediately
        closeComposer();
      }
      // If mode is already not "dialog", the close was programmatic - do nothing
    }
  };

  const handleConfirmClose = () => {
    setShowCancelConfirm(false);
    resetComposer();
    closeComposer();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="!max-w-none w-full h-[90vh] p-0 flex flex-col overflow-hidden sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] 2xl:w-[1200px]">
          <DialogHeader className="sr-only">
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription>
              Create and schedule content for your social media accounts
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 flex overflow-hidden">
            {contentGroupIsError ? (
              <ComposerErrorState
                onRetry={handleRetry}
                onClose={closeComposer}
              />
            ) : isPending ? (
              <ComposerSkeleton />
            ) : (
              <TwoColumnLayout
                left={<ComposerLeft />}
                right={<ComposerRight />}
                className=""
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CancelConfirmationDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        onConfirm={handleConfirmClose}
      />
    </>
  );
}
