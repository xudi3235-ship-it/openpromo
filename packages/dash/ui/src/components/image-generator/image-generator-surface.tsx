import { cn } from "@openpromo/ui/lib/utils";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ImageGenListResponse } from "@/queries/image-gen";
import type {
  ProductImageGenerateInput,
  ProductImageGenerateResponse,
} from "@/queries/product";
import { GeneratedImagesGallery } from "./generated-images-gallery";
import { InputsPanel } from "./inputs-panel";
import type { ProductSelectItem } from "./product-select";
import type { StyleGalleryItem } from "./style-gallery";

type Generation = NonNullable<ImageGenListResponse["generations"]>[number];

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
  onGenerationEditRequest?: (generation: Generation) => void;
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
  onGenerationEditRequest,
}: ImageGeneratorSurfaceProps) {
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
        />
      </div>
      <div className="min-h-0">
        <GeneratedImagesGallery
          generateMutation={generateMutation}
          remainingSlots={remainingSlots}
          enableComposerActions={enableComposerActions}
          onEditGeneration={onGenerationEditRequest}
        />
      </div>
    </div>
  );
}
