import { cn } from "@openpromo/ui/lib/utils";
import { Check, Search } from "lucide-react";
import type { ProductSelectItem } from "@/components/image-generator/product-select";

interface QuickAdProductGridProps {
  products: ProductSelectItem[];
  selectedProductId: string;
  onProductSelect: (productId: string) => void;
  onBrowseAll: () => void;
  isLoading?: boolean;
  maxVisible?: number;
}

function getProductImage(product: ProductSelectItem): string | null {
  if (!product.attachments?.length) return null;
  const primaryAttachment = product.attachments.find(
    (a) => a.id === product.primaryAttachmentId,
  );
  const attachment = primaryAttachment || product.attachments[0];
  if (attachment?.type !== "photo") return null;
  return (
    attachment.thumbnailUrl ||
    attachment.publicUrl ||
    attachment.presignedUrl ||
    null
  );
}

export function QuickAdProductGrid({
  products,
  selectedProductId,
  onProductSelect,
  onBrowseAll,
  isLoading = false,
  maxVisible = 4,
}: QuickAdProductGridProps) {
  const visibleProducts = products.slice(0, maxVisible);
  const hasMore = products.length > maxVisible;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {["a", "b", "c", "d", "e", "f"].slice(0, maxVisible).map((id) => (
          <div
            key={id}
            className="w-20 h-20 bg-muted rounded-lg animate-pulse flex-shrink-0"
          />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="w-20 h-20 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
          <span className="text-2xl text-muted-foreground/50">+</span>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium">No products yet</p>
          <p className="text-xs">Add a product to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {visibleProducts.map((product) => {
        const imageUrl = getProductImage(product);
        const isSelected = product.id === selectedProductId;
        const productName = product.name || "Untitled";

        return (
          <button
            key={product.id}
            type="button"
            onClick={() => onProductSelect(product.id)}
            className={cn(
              "relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 transition-all group",
              "border-2 cursor-pointer",
              isSelected
                ? "border-primary ring-2 ring-primary/20 shadow-md"
                : "border-border hover:border-muted-foreground hover:shadow-sm",
            )}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={productName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground text-center px-1 line-clamp-2">
                  {productName}
                </span>
              </div>
            )}
            {isSelected && (
              <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1">
              <p className="text-[10px] text-white truncate font-medium">
                {productName}
              </p>
            </div>
          </button>
        );
      })}

      {hasMore && (
        <button
          type="button"
          onClick={onBrowseAll}
          className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex flex-col items-center justify-center gap-1 flex-shrink-0 transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">
            +{products.length - maxVisible} more
          </span>
        </button>
      )}

      {!hasMore && products.length > 0 && (
        <button
          type="button"
          onClick={onBrowseAll}
          className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex flex-col items-center justify-center gap-1 flex-shrink-0 transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">
            Browse all
          </span>
        </button>
      )}
    </div>
  );
}
