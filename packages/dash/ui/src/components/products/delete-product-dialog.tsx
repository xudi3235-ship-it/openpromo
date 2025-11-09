import type { ProductSelectType } from "@core/schemas/product.sql";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useProductDeleteMutation } from "@/queries/product";

interface DeleteProductDialogProps {
  product: ProductSelectType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteProductDialog({
  product,
  open,
  onOpenChange,
}: DeleteProductDialogProps) {
  const deleteMutation = useProductDeleteMutation(() => {
    onOpenChange(false);
  });

  const handleDelete = async () => {
    if (!product) return;
    await deleteMutation.mutateAsync({ productId: product.id });
  };

  if (!product) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete product?"
      desc={`Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
      confirmText={deleteMutation.isPending ? "Deleting..." : "Delete"}
      destructive
      handleConfirm={handleDelete}
      isLoading={deleteMutation.isPending}
    />
  );
}
