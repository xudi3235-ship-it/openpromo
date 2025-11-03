import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";

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
}: ProductSelectProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="product-select"
        className="text-xs font-medium text-muted-foreground"
      >
        Product
      </label>
      <Select value={selectedProductId} onValueChange={onProductChange}>
        <SelectTrigger id="product-select" className="w-full">
          <SelectValue placeholder="Select a product...">
            {selectedProductId &&
              (() => {
                const product = products.find(
                  (p) => p.id === selectedProductId,
                );
                if (!product) return null;
                const imageUrl = getProductImage(product);
                return (
                  <div className="flex items-center gap-2">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name || product.id}
                        className="w-5 h-5 object-cover rounded"
                      />
                    ) : (
                      <div className="w-5 h-5 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        ?
                      </div>
                    )}
                    <span className="text-sm truncate">
                      {product.name || product.id}
                    </span>
                  </div>
                );
              })()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {products.map((product) => {
            const imageUrl = getProductImage(product);
            return (
              <SelectItem key={product.id} value={product.id}>
                <div className="flex items-center gap-2">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name || product.id}
                      className="w-6 h-6 object-cover rounded"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                      ?
                    </div>
                  )}
                  <span className="text-sm">{product.name || product.id}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
