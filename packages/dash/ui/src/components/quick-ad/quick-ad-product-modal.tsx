import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@openpromo/ui/components/dialog";
import { Input } from "@openpromo/ui/components/input";
import { cn } from "@openpromo/ui/lib/utils";
import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ProductSelectItem } from "@/components/image-generator/product-select";

interface QuickAdProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductSelectItem[];
  selectedProductId: string;
  onProductSelect: (productId: string) => void;
  isLoading?: boolean;
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

export function QuickAdProductModal({
  open,
  onOpenChange,
  products,
  selectedProductId,
  onProductSelect,
  isLoading = false,
}: QuickAdProductModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter((product) =>
      (product.name || "").toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Product</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-4 -mx-6 px-6">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => (
                <div
                  key={id}
                  className="aspect-square bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {searchQuery ? (
                <p>No products match "{searchQuery}"</p>
              ) : (
                <p>No products found</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 pb-4">
              {filteredProducts.map((product) => {
                const imageUrl = getProductImage(product);
                const isSelected = product.id === selectedProductId;
                const productName = product.name || "Untitled";

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onProductSelect(product.id)}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden transition-all group",
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
                        <span className="text-sm text-muted-foreground text-center px-2 line-clamp-3">
                          {productName}
                        </span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-xs text-white truncate font-medium">
                        {productName}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
