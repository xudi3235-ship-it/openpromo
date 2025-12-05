import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import { ProductVisualsContent } from "@/components/product-visuals-v2/product-visuals-content";
import { useProductVisualGeneratorStore } from "@/stores/product-visual-generator-store";

interface MediaGeneratorDialogProps {
  styles: StyleGalleryItem[];
  isLoadingStyles: boolean;
}

export function MediaGeneratorDialog({
  styles,
  isLoadingStyles,
}: MediaGeneratorDialogProps) {
  const isOpen = useProductVisualGeneratorStore(
    (state) => state.isGeneratorDialogOpen,
  );
  const setOpen = useProductVisualGeneratorStore(
    (state) => state.setGeneratorDialogOpen,
  );

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-w-7xl min-w-[50vw] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Create Product Visuals</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 pb-6 overflow-hidden">
          <ProductVisualsContent
            styles={styles}
            isLoadingStyles={isLoadingStyles}
            userId="media-generator"
            onBatchAddedToComposer={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
