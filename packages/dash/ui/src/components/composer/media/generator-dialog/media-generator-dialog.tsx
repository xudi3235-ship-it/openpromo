import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import type {
  ProductImageGenerateInput,
  ProductImageGenerateResponse,
} from "@/queries/product";
import { useProductListQuery } from "@/queries/product";
import { useImageGenComposerStore } from "@/stores/image-gen-composer-store";
import type { StyleGalleryItem } from "../style-gallery";
import { InputsPanel } from "./inputs-panel";
import { GeneratedImagesGallery } from "./progress-panel";

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
  const isOpen = useImageGenComposerStore(
    (state) => state.isGeneratorDialogOpen,
  );
  const setOpen = useImageGenComposerStore(
    (state) => state.setGeneratorDialogOpen,
  );

  // Dialog has its own independent product search state
  const [productSearch, setProductSearch] = useState("");

  // Dialog's own product list query with search
  const { data: productsData, isLoading: isLoadingProducts } =
    useProductListQuery({ search: productSearch || undefined });

  const products = productsData?.products || [];

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-w-5xl lg:max-w-6xl h-[calc(100vh-120px)] max-h-[800px] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Create Product Image</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6 pb-6">
          <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
            <InputsPanel
              products={products}
              styles={styles}
              isLoadingProducts={isLoadingProducts}
              isLoadingStyles={isLoadingStyles}
              remainingSlots={remainingSlots}
              generateMutation={generateMutation}
              productSearch={productSearch}
              onProductSearchChange={setProductSearch}
            />
            <GeneratedImagesGallery
              generateMutation={generateMutation}
              remainingSlots={remainingSlots}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
