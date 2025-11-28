import { Dialog, DialogContent } from "@openpromo/ui/components/dialog";
import type { ProductVisualsFeedResponse } from "@/queries/product-visuals";

type FeedItem = ProductVisualsFeedResponse["items"][number];

interface ProductVisualsPreviewModalProps {
  previewItem: FeedItem | null;
  onClose: () => void;
}

export function ProductVisualsPreviewModal({
  previewItem,
  onClose,
}: ProductVisualsPreviewModalProps) {
  return (
    <Dialog open={!!previewItem} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none"
        showCloseButton={true}
      >
        {previewItem && (
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            {previewItem.type === "video" && previewItem.outputUrl ? (
              <video
                src={previewItem.outputUrl}
                autoPlay
                loop
                controls
                className="max-w-full max-h-[80vh] object-contain"
              />
            ) : previewItem.outputUrl ? (
              <img
                src={previewItem.outputUrl}
                alt="Preview"
                className="max-w-full max-h-[80vh] object-contain"
              />
            ) : (
              <div className="text-white/50 text-sm">No preview available</div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
