import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import { Skeleton } from "@openpromo/ui/components/skeleton";

export interface ProductSelectItem {
  id: string;
  name: string | null;
  primaryAttachmentId: string | null;
  attachments?: Array<{
    id: string;
    type: string;
    thumbnailUrl?: string | null;
    publicUrl?: string | null;
    presignedUrl?: string | null;
  }> | null;
}

export interface ProductSelectProps {
  products: ProductSelectItem[];
  selectedProductId: string;
  onProductChange: (productId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  helperText?: string;
}

const getProductImage = (product: ProductSelectItem) => {
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
};

export function ProductSelect({
  products,
  selectedProductId,
  onProductChange,
  isLoading = false,
  disabled = false,
  helperText,
}: ProductSelectProps) {
  const hasNoResults = !isLoading && products.length === 0;

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        <label
          htmlFor="product-select"
          className="text-xs font-medium text-muted-foreground"
        >
          Product
        </label>
        <div className="flex items-center gap-2 h-10 px-3 py-2 border rounded-md">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 flex-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor="product-select"
          className="text-xs font-medium text-muted-foreground"
        >
          Product
        </label>
        {disabled && helperText && (
          <span className="text-[11px] text-muted-foreground">
            {helperText}
          </span>
        )}
      </div>
      <Select
        value={selectedProductId}
        onValueChange={onProductChange}
        disabled={disabled}
      >
        <SelectTrigger
          id="product-select"
          className="w-full"
          disabled={disabled}
        >
          <SelectValue placeholder="Select a product...">
            {selectedProductId &&
              (() => {
                const product = products.find(
                  (p) => p.id === selectedProductId,
                );
                if (!product) return null;
                const imageUrl = getProductImage(product);
                const productName = product.name || product.id;
                const displayName =
                  productName.length > 40
                    ? `${productName.substring(0, 40)}...`
                    : productName;
                return (
                  <div className="flex items-center gap-2 min-w-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={productName}
                        className="w-5 h-5 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                        ?
                      </div>
                    )}
                    <span className="text-sm truncate" title={productName}>
                      {displayName}
                    </span>
                  </div>
                );
              })()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {hasNoResults ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No products found
            </div>
          ) : (
            products.map((product) => {
              const imageUrl = getProductImage(product);
              const productName = product.name || product.id;
              const displayName =
                productName.length > 50
                  ? `${productName.substring(0, 50)}...`
                  : productName;
              return (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center gap-2 min-w-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={productName}
                        className="w-6 h-6 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                        ?
                      </div>
                    )}
                    <span className="text-sm truncate" title={productName}>
                      {displayName}
                    </span>
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
