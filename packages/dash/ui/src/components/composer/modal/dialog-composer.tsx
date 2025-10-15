import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { useEffect } from "react";
import { useConnectedAccounts } from "@/queries/connected-account";
import { useContentGroupQuery } from "@/queries/content";
import { useComposerStore } from "@/stores/composer-store";
import { useDialogComposerStore } from "@/stores/dialog-composer-store";
import { ComposerLeft } from "../layout/composer-left";
import { ComposerRight } from "../layout/composer-right";
import { TwoColumnLayout } from "../layout/two-column-layout";

export default function ComposerDialog() {
  const {
    mode,
    closeComposer,
    pendingContentGroupID,
    initialContentCreateData,
  } = useDialogComposerStore();
  const initializeComposer = useComposerStore(
    (state) => state.initializeComposer,
  );

  const { accounts: accountsData } = useConnectedAccounts();
  const { data: contentGroupData } = useContentGroupQuery(
    pendingContentGroupID,
  );

  const isOpen = mode === "dialog";

  // Initialize composer when dialog opens
  useEffect(() => {
    if (isOpen && accountsData) {
      const contentData =
        contentGroupData?.contentCreateData ?? initialContentCreateData;

      initializeComposer({
        // @ts-expect-error - Type mismatch between API response (string dates) and store type (Date objects)
        initContentCreateData: contentData || undefined,
        contentGroupID: pendingContentGroupID,
        initialAccounts: accountsData,
        initialMessage: "",
      });
    }
  }, [
    isOpen,
    accountsData,
    contentGroupData?.contentCreateData,
    initialContentCreateData,
    pendingContentGroupID,
    initializeComposer,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeComposer()}>
      <DialogContent className="!max-w-none w-full h-[90vh] p-0 flex flex-col overflow-hidden sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] 2xl:w-[1200px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Create and schedule content for your social media accounts
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <TwoColumnLayout
            left={<ComposerLeft />}
            right={<ComposerRight />}
            className=""
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
