import type { ProductSelectType } from "@core/schemas/product.sql";
import { Button } from "@openpromo/ui/components/button";
import { Input } from "@openpromo/ui/components/input";
import type { Table } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";

interface ProductTableHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  table: Table<ProductSelectType>;
  onAddProduct: () => void;
}

export function ProductTableHeader({
  searchValue,
  onSearchChange,
  onAddProduct,
}: ProductTableHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-sm text-muted-foreground">
          Manage your product catalog for content generation
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onSearchChange(e.target.value)
            }
            className="pl-9"
          />
        </div>
        <Button onClick={onAddProduct}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>
    </div>
  );
}
