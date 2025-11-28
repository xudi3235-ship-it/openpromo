import { cn } from "@openpromo/ui/lib/utils";
import type { UseMutationResult } from "@tanstack/react-query";
import { useCallback } from "react";
import { ProductVisualsGallery } from "@/components/product-visuals/product-visuals-gallery";
import { useWorkspaceEvents } from "@/hooks/useWorkspaceWebSocket";
import { useImageGenRefineMutation } from "@/queries/image-gen";
import type {
  ProductImageGenerateInput,
  ProductImageGenerateResponse,
} from "@/queries/product";
import { useProductVisualsFeedQuery } from "@/queries/product-visuals";
import { useProductVisualGeneratorStore } from "@/stores/product-visual-generator-store";
import { InputsPanel } from "./inputs-panel";
import type { ProductSelectItem } from "./product-select";
import type { StyleGalleryItem } from "./style-gallery";

export interface ImageGeneratorSurfaceProps {
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
  productSearch: string;
  onProductSearchChange: (value: string) => void;
  enableComposerActions?: boolean;
  className?: string;
  showGallery?: boolean;
  generationMode?: "images" | "video";
  onGenerationModeChange?: (mode: "images" | "video") => void;
}

export function ImageGeneratorSurface({
  products,
  styles,
  isLoadingProducts,
  isLoadingStyles,
  remainingSlots,
  generateMutation,
  productSearch,
  onProductSearchChange,
  enableComposerActions = true,
  className,
  showGallery = true,
  generationMode,
  onGenerationModeChange,
}: ImageGeneratorSurfaceProps) {
  // Fetch product visuals feed (images + videos)
  const {
    data: feedData,
    isPending: isFeedPending,
    refetch: refetchFeed,
  } = useProductVisualsFeedQuery({
    page: 1,
    pageSize: 18,
  });

  const selectedItemForVariation = useProductVisualGeneratorStore(
    (state) => state.selectedItemForVariation,
  );
  const variationPrompt = useProductVisualGeneratorStore(
    (state) => state.variationPrompt,
  );
  const setVariationPrompt = useProductVisualGeneratorStore(
    (state) => state.setVariationPrompt,
  );
  const setSelectedParentForVariations = useProductVisualGeneratorStore(
    (state) => state.setSelectedParentForVariations,
  );
  const setSelectedItemForVariation = useProductVisualGeneratorStore(
    (state) => state.setSelectedItemForVariation,
  );
  const clearSelectedGalleryItems = useProductVisualGeneratorStore(
    (state) => state.clearSelectedGalleryItems,
  );
  const variationRefetch = useProductVisualGeneratorStore(
    (state) => state.variationRefetch,
  );

  const handleFeedRefresh = useCallback(() => {
    void refetchFeed();
  }, [refetchFeed]);

  useWorkspaceEvents({
    handlers: {
      "image_generation.updated": handleFeedRefresh,
      "video_generation.updated": handleFeedRefresh,
    },
  });

  const refineMutation = useImageGenRefineMutation(() => {
    void refetchFeed();
    variationRefetch?.();
  });

  const handleConfirmVariation = () => {
    if (!selectedItemForVariation) return;

    const parentId = selectedItemForVariation.id;

    refineMutation.mutate({
      generationId: parentId,
      prompt: variationPrompt.trim() || undefined,
    });

    setSelectedParentForVariations(parentId);
    setSelectedItemForVariation(null);
    setVariationPrompt("");
    clearSelectedGalleryItems();
  };

  const handleCancelVariation = () => {
    setSelectedItemForVariation(null);
    setVariationPrompt("");
    clearSelectedGalleryItems();
  };

  const feedItems = feedData?.items ?? [];

  if (!showGallery) {
    return (
      <div className={cn("h-full", className)}>
        <InputsPanel
          products={products}
          styles={styles}
          isLoadingProducts={isLoadingProducts}
          isLoadingStyles={isLoadingStyles}
          remainingSlots={remainingSlots}
          generateMutation={generateMutation}
          productSearch={productSearch}
          onProductSearchChange={onProductSearchChange}
          isVariationPending={refineMutation.isPending}
          onConfirmVariation={handleConfirmVariation}
          onCancelVariation={handleCancelVariation}
          className="h-full"
          generationMode={generationMode}
          onGenerationModeChange={onGenerationModeChange}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid h-full grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]",
        className,
      )}
    >
      <div className="min-h-0">
        <InputsPanel
          products={products}
          styles={styles}
          isLoadingProducts={isLoadingProducts}
          isLoadingStyles={isLoadingStyles}
          remainingSlots={remainingSlots}
          generateMutation={generateMutation}
          productSearch={productSearch}
          onProductSearchChange={onProductSearchChange}
          isVariationPending={refineMutation.isPending}
          onConfirmVariation={handleConfirmVariation}
          onCancelVariation={handleCancelVariation}
          generationMode={generationMode}
          onGenerationModeChange={onGenerationModeChange}
        />
      </div>
      <div className="min-h-0">
        <ProductVisualsGallery
          items={feedItems}
          isLoading={isFeedPending}
          onRefetch={refetchFeed}
          enableComposerActions={enableComposerActions}
        />
      </div>
    </div>
  );
}
