import { Plus } from "lucide-react";
import { GridCard, GridCardMedia } from "@/components/common";

interface AddProductCardProps {
  onAddProduct: () => void;
}

export function AddProductCard({ onAddProduct }: AddProductCardProps) {
  return (
    <GridCard
      onClick={onAddProduct}
      className="cursor-pointer border border-dashed border-muted/30 bg-muted/5 transition-colors hover:border-foreground/70"
    >
      <GridCardMedia>
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-foreground/20 bg-background text-foreground/80">
            <Plus className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">Add product</p>
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Import items you sell so they’re ready for generation.
          </p>
        </div>
      </GridCardMedia>
    </GridCard>
  );
}
