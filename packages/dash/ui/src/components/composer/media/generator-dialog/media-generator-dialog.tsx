import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import type { UseMutationResult } from "@tanstack/react-query";
import type {
  ProductImageGenerateInput,
  ProductImageGenerateResponse,
} from "@/queries/product";
import { useImageGenComposerStore } from "@/stores/image-gen-composer-store";
import type { ProductSelectItem } from "../product-select";
import type { StyleGalleryItem } from "../style-gallery";
import { InputsPanel } from "./inputs-panel";
import { ProgressPanel } from "./progress-panel";

interface MediaGeneratorDialogProps {
  products: ProductSelectItem[];
  styles: StyleGalleryItem[];
  isLoadingProducts: boolean;
  isLoadingStyles: boolean;
  remainingSlots: number;
  generateMutation: UseMutationResult<
    ProductImageGenerateResponse,
    Error,
    ProductImageGenerateInput,
    unknown
  >;
}

export function MediaGeneratorDialog({
  products,
  styles,
  isLoadingProducts,
  isLoadingStyles,
  remainingSlots,
  generateMutation,
}: MediaGeneratorDialogProps) {
  const isOpen = useImageGenComposerStore(
    (state) => state.isGeneratorDialogOpen,
  );
  const setOpen = useImageGenComposerStore(
    (state) => state.setGeneratorDialogOpen,
  );

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-w-5xl lg:max-w-6xl h-[calc(100vh-120px)] max-h-[800px] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Image generator workspace</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6">
          <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
            <InputsPanel
              products={products}
              styles={styles}
              isLoadingProducts={isLoadingProducts}
              isLoadingStyles={isLoadingStyles}
              remainingSlots={remainingSlots}
              generateMutation={generateMutation}
            />
            <ProgressPanel
              generateMutation={generateMutation}
              remainingSlots={remainingSlots}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
