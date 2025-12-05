import type { ProductSelectType } from "@core/schemas/product.sql";
import type { ColumnDef } from "@tanstack/react-table";
import { Image } from "lucide-react";

function getProductThumbnail(product: ProductSelectType): string | undefined {
  if (product.attachments && product.attachments.length > 0) {
    const primaryAttachment = product.primaryAttachmentId
      ? product.attachments.find(
          (att) => att.id === product.primaryAttachmentId,
        )
      : product.attachments[0];

    return primaryAttachment?.publicUrl || product.attachments[0]?.publicUrl;
  }
  return undefined;
}

function ProductThumbnail({
  src,
  alt = "Product image",
  className = "rounded-lg object-cover",
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={`${className} w-12 h-12 bg-muted flex items-center justify-center`}
      >
        <Image className="w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      width={48}
      height={48}
      src={src}
      alt={alt}
      className={`${className} w-12 h-12`}
    />
  );
}

export const productColumn: ColumnDef<ProductSelectType> = {
  accessorKey: "name",
  size: 20,
  minSize: 20,
  maxSize: 20,
  header: "Product",
  cell: ({ row }) => {
    const product = row.original;
    const thumbnailUrl = getProductThumbnail(product);

    return (
      <div className="flex items-center space-x-3">
        <ProductThumbnail src={thumbnailUrl} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {product.name}
          </p>
          {product.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[300px]">
              {product.description}
            </p>
          )}
        </div>
      </div>
    );
  },
};
