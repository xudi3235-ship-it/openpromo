import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { ComposerProvider } from "@/providers/composer-provider";
import { useConnectedAccounts } from "@/queries/connected-account";
import { ComposerLeft } from "../composer-left";
import { ComposerRight } from "../composer-right";
import { ComposerSkeleton } from "../composer-skeleton";

interface ComposerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ComposerDialog({
  isOpen,
  onClose,
}: ComposerDialogProps) {
  const { data, isLoading } = useConnectedAccounts();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-none w-full h-[90vh] p-0 flex flex-col overflow-hidden sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] 2xl:w-[1200px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Create and schedule content for your social media accounts
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-1 overflow-hidden">
          {isLoading ? (
            <ComposerSkeleton />
          ) : (
            <ComposerProvider
              initialAccounts={data?.accounts ?? []}
              initialPlacementSelected="ALL"
              initialSelectedPreview="FACEBOOK"
              initialMessage="Hello world!"
            >
              <ComposerLeft />
              <ComposerRight />
            </ComposerProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
