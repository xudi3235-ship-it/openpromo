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

interface ComposerDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ComposerDialog({
  isOpen,
  onClose,
}: ComposerDialogProps) {
  const { data } = useConnectedAccounts();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-none w-[50vw] h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Create and schedule content for your social media accounts
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-1 overflow-hidden">
          <ComposerProvider
            initialAccounts={data?.accounts ?? []}
            initialPlacementSelected="ALL"
            initialSelectedPreview="FACEBOOK"
            initialMessage="Hello world!"
          >
            <ComposerLeft />
            <ComposerRight />
          </ComposerProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
