import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { useComposerDialogLifecycle } from "@/hooks/composer/useComposerHooks";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";
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
  const isOpen = mode === "dialog";
  const { isLoading, contentGroupError } = useComposerDialogLifecycle({
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

  const hasError = contentGroupError && pendingContentGroupID;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeComposer()}>
      <DialogContent className="!max-w-none w-full h-[90vh] p-0 flex flex-col overflow-hidden sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] 2xl:w-[1200px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Create and schedule content for your social media accounts
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 flex overflow-hidden">
          {hasError ? (
            <ComposerErrorState onRetry={handleRetry} onClose={closeComposer} />
          ) : isLoading ? (
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
  );
}
