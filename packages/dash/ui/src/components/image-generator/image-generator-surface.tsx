import { cn } from "@openpromo/ui/lib/utils";
import type { UseMutationResult } from "@tanstack/react-query";
import type {
  ProductImageGenerateInput,
  ProductImageGenerateResponse,
} from "@/queries/product";
import { GeneratedImagesGallery } from "./generated-images-gallery";
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
  className?: string;
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
  className,
}: ImageGeneratorSurfaceProps) {
  return (
    <div
      className={cn(
        "grid h-full grid-cols-1 gap-6 lg:grid-cols-[420px_1fr] overflow-hidden",
        className,
      )}
    >
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
      <GeneratedImagesGallery
        generateMutation={generateMutation}
        remainingSlots={remainingSlots}
      />
    </div>
  );
}
