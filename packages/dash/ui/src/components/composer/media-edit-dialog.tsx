import type { SharedAttachmentSpec } from "@core/schemas/content.sql";
import { Button } from "@openpromo/ui/components/button";
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

export function MediaEditDialog({
  editing,
  onClose,
  renderAttachment,
}: MediaEditDialogProps) {
  return (
    <Dialog open={!!editing} onOpenChange={onClose}>
      <DialogContent className="md:min-h-[70vh] w-full">
        <DialogHeader className="space-y-1">
          <DialogTitle>Edit media</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Fine-tune this attachment. Cropping, enhancements, and integrations
            are on the way.
          </p>
        </DialogHeader>
        {editing && (
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-1 rounded-lg bg-muted/30 p-4">
              {renderAttachment(
                editing.attachment,
                "h-[26rem] w-full object-contain md:h-[32rem]",
                true,
              )}
            </div>
            <div className="flex w-full flex-col gap-4 md:w-80">
              <section className="rounded-lg border bg-background p-4">
                <h4 className="text-sm font-semibold">Adjustments</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add cropping, filters, and overlays here.
                </p>
              </section>
              <section className="rounded-lg border bg-background p-4">
                <h4 className="text-sm font-semibold">Integrations</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hook up Canva, Google Drive, or brand libraries to replace
                  media.
                </p>
              </section>
              <div className="mt-auto flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onClose}>Done</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
