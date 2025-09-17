import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import type { ContentCreateData } from "@worker/routes/api/workspaces/content";
import { useConnectedAccounts } from "@/queries/connected-account";
import { useContentGroupQuery } from "@/queries/content";
import type { ComposerProps } from "@/stores/composer-store";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";
import { ComposerSkeleton } from "../composer-skeleton";
import { ResizableComposer } from "../resizable-composer";

export default function ComposerDialog() {
  const { isOpen, pendingContentGroupID, closeDialog } =
    useDialogComposerStore();
  const { accounts: accountsData, isLoading: accountsLoading } =
    useConnectedAccounts();
  const { data: contentGroupData, isLoading: contentGroupLoading } =
    useContentGroupQuery(pendingContentGroupID);
  const isLoading = accountsLoading || contentGroupLoading;

  const initComposerProps = {
    initContentCreateData:
      contentGroupData?.contentCreateData as ContentCreateData,
  } as ComposerProps;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="!max-w-none w-full h-[90vh] p-0 flex flex-col overflow-hidden sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] 2xl:w-[1200px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Create and schedule content for your social media accounts
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <ComposerSkeleton />
          ) : (
            <ResizableComposer
              accounts={accountsData ?? []}
              initComposerProps={initComposerProps}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
