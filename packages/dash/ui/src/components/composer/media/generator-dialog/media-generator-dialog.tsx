import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import { ImageGeneratorSurface } from "@/components/image-generator/image-generator-surface";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import type {
  ProductImageGenerateInput,
  ProductImageGenerateResponse,
} from "@/queries/product";
import { useProductListQuery } from "@/queries/product";
import { useProductVisualGeneratorStore } from "@/stores/product-visual-generator-store";

interface MediaGeneratorDialogProps {
  styles: StyleGalleryItem[];
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
  styles,
  isLoadingStyles,
  remainingSlots,
  generateMutation,
}: MediaGeneratorDialogProps) {
  const isOpen = useProductVisualGeneratorStore(
    (state) => state.isGeneratorDialogOpen,
  );
  const setOpen = useProductVisualGeneratorStore(
    (state) => state.setGeneratorDialogOpen,
  );
  const generationType = useProductVisualGeneratorStore(
    (state) => state.generationType,
  );
  const setGenerationType = useProductVisualGeneratorStore(
    (state) => state.setGenerationType,
  );

  // Dialog has its own independent product search state
  const [productSearch, setProductSearch] = useState("");

  // Dialog's own product list query with search
  const { data: productsData, isPending: isPendingProducts } =
    useProductListQuery({ search: productSearch || undefined });

  const products = productsData?.products || [];

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="!max-w-none w-full h-[90vh] p-0 gap-0 flex flex-col overflow-hidden sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] 2xl:w-[1200px]">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Create Product Visuals</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 pb-6 overflow-hidden">
          <ImageGeneratorSurface
            products={products}
            styles={styles}
            isLoadingProducts={isPendingProducts}
            isLoadingStyles={isLoadingStyles}
            remainingSlots={remainingSlots}
            generateMutation={generateMutation}
            productSearch={productSearch}
            onProductSearchChange={setProductSearch}
            generationMode={generationType}
            onGenerationModeChange={setGenerationType}
            enableComposerActions={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
