import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import type { ReactNode } from "react";

type RenderFn = (
  attachment: SharedAttachmentSpec,
  className?: string,
  controls?: boolean,
) => ReactNode;

interface MediaEditDialogProps {
  editing: {
    attachment: SharedAttachmentSpec;
    index: number;
  } | null;
  onClose: () => void;
  renderAttachment: RenderFn;
}

export function MediaEditDialog({ editing, onClose }: MediaEditDialogProps) {
  return (
    <Dialog open={!!editing} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-6xl md:min-h-[70vh] min-w-[90vw]">
        <DialogHeader className="space-y-1">
          <DialogTitle>Edit media</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
