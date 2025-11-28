import { cn } from "@openpromo/ui/lib/utils";
import type { UseMutationResult } from "@tanstack/react-query";
import { useCallback } from "react";
import { ProductVisualsGallery } from "@/components/product-visuals/product-visuals-gallery";
import { useWorkspaceEvents } from "@/hooks/useWorkspaceWebSocket";
import type {
  ProductImageGenerateInput,
  ProductImageGenerateResponse,
} from "@/queries/product";
import { useProductVisualsFeedQuery } from "@/queries/product-visuals";
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

  const handleFeedRefresh = useCallback(() => {
    void refetchFeed();
  }, [refetchFeed]);

  useWorkspaceEvents({
    handlers: {
      "image_generation.updated": handleFeedRefresh,
      "video_generation.updated": handleFeedRefresh,
    },
  });

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
