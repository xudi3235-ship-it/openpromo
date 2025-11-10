import { Plus } from "lucide-react";
import { ImageGridCard } from "@/components/common/ImageGrid";

interface AddProductCardProps {
  onAddProduct: () => void;
}

export function AddProductCard({ onAddProduct }: AddProductCardProps) {
  return (
    <ImageGridCard
      onClick={onAddProduct}
      bordered
      aspectRatio="square"
      className="bg-muted/30 hover:bg-muted/50 transition-colors"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
        <div className="flex size-12 items-center justify-center rounded-lg border border-border bg-background">
          <Plus className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-foreground">Add Product</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Import products you're selling for image generation
          </p>
        </div>
      </div>
    </ImageGridCard>
  );
}
