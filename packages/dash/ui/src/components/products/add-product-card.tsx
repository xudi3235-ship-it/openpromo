import { Plus } from "lucide-react";

interface AddProductCardProps {
  onAddProduct: () => void;
}

export function AddProductCard({ onAddProduct }: AddProductCardProps) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onAddProduct}
        className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl border border-border bg-muted/30 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      </button>
    </div>
  );
}
