import type { ProductSelectType } from "@core/schemas/product.sql";
import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useProductDeleteMutation } from "@/queries/product";

function ActionsCell({ product }: { product: ProductSelectType }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteMutation = useProductDeleteMutation();

  const handleDelete = () => {
    deleteMutation.mutate(product.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
      },
    });
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2 w-full">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                /* TODO: Implement view */
              }}
            >
              <Eye className="w-4 h-4 mr-2" /> View details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                /* TODO: Implement edit */
              }}
            >
              <Edit className="w-4 h-4 mr-2" /> Edit product
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowDeleteConfirm(true)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Product"
        desc="Are you sure you want to delete this product? This action cannot be undone."
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={handleDelete}
      />
    </>
  );
}

export const actionsColumn: ColumnDef<ProductSelectType> = {
  id: "actions",
  enableHiding: false,
  size: 80,
  minSize: 80,
  maxSize: 80,
  cell: ({ row }) => <ActionsCell product={row.original} />,
};
