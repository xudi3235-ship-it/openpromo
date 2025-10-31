import type { ProductSelectType } from "@core/schemas/product.sql";
import type { Table } from "@tanstack/react-table";
import { ProductTableHeader } from "./product-table-header";

interface ProductTableLayoutProps {
  children: React.ReactNode;
  searchValue: string;
  onSearchChange: (value: string) => void;
  table: Table<ProductSelectType>;
  onAddProduct: () => void;
}

export function ProductTableLayout({
  children,
  searchValue,
  onSearchChange,
  table,
  onAddProduct,
}: ProductTableLayoutProps) {
  return (
    <div className="w-full space-y-4">
      <ProductTableHeader
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        table={table}
        onAddProduct={onAddProduct}
      />

      {children}
    </div>
  );
}
