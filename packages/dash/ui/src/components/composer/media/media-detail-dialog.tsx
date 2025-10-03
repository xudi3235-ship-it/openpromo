import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import type { SharedAttachmentSpec } from "@shared/content";
import type { ReactNode } from "react";

type RenderFn = (
  attachment: SharedAttachmentSpec,
  className?: string,
  controls?: boolean,
) => ReactNode;

interface MediaDetailDialogProps {
  selected: {
    attachment: SharedAttachmentSpec;
    index: number;
  } | null;
  onClose: () => void;
  renderAttachment: RenderFn;
}

export function MediaDetailDialog({
  selected,
  onClose,
  renderAttachment,
}: MediaDetailDialogProps) {
  return (
    <Dialog open={!!selected} onOpenChange={onClose}>
      <DialogContent className="max-w-10xl max-h-[95vh] p-0 min-w-[90vw] w-full">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Media Details</DialogTitle>
        </DialogHeader>
        {selected && (
          <div className="flex flex-col overflow-hidden">
            <div className="flex-1 flex items-center justify-center bg-muted/20 p-4">
              {renderAttachment(
                selected.attachment,
                "max-h-[70vh] w-auto",
                true,
              )}
            </div>

            {selected.attachment.file && (
              <div className="border-t p-6 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Filename:</span>
                    <p className="font-medium">
                      {selected.attachment.file.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">File size:</span>
                    <p className="font-medium">
                      {(selected.attachment.file.size / 1024 / 1024).toFixed(2)}{" "}
                      MB
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">
                      {selected.attachment.file.type}
                    </p>
                  </div>
                  {selected.attachment.metadata?.aspectRatio && (
                    <div>
                      <span className="text-muted-foreground">
                        Aspect ratio:
                      </span>
                      <p className="font-medium">
                        {selected.attachment.metadata.aspectRatio as string}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selected.attachment.file &&
              selected.attachment.metadata?.previewIframeUrl && (
                <div className="border-t p-4">
                  <p className="text-center text-sm text-muted-foreground">
                    {selected.attachment.metadata?.originalFilename ||
                      "Uploaded Video"}
                  </p>
                </div>
              )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
