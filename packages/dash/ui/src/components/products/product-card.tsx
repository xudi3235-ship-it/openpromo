import type { ProductSelectType } from "@core/schemas/product.sql";
import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Card, CardContent, CardHeader } from "@openpromo/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { ExternalLink, MoreHorizontal, Pencil, Trash } from "lucide-react";
import * as React from "react";
import { CreateProductModal } from "./create-product-modal";
import { DeleteProductDialog } from "./delete-product-dialog";

interface ProductCardProps {
  product: ProductSelectType;
}

export function ProductCard({ product }: ProductCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const primaryAttachment = product.attachments.find(
    (a) => a.id === product.primaryAttachmentId,
  );
  const imageAttachment =
    primaryAttachment ?? product.attachments.find((a) => a.type === "photo");

  const sourceColors: Record<string, string> = {
    MANUAL: "bg-gray-500/10 text-gray-500",
    AMAZON: "bg-orange-500/10 text-orange-500",
    SHOPIFY: "bg-green-500/10 text-green-500",
    ETSY: "bg-pink-500/10 text-pink-500",
    CUSTOM_URL: "bg-blue-500/10 text-blue-500",
  };

  const imageUrl =
    imageAttachment?.type === "photo"
      ? (imageAttachment.publicUrl ?? imageAttachment.presignedUrl)
      : undefined;

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return null;
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const createdDate = formatDate(product.createdAt);
  const attachmentCount = product.attachments.length;

  const handleCardClick = () => {
    // Only open edit modal if no dialogs are currently open
    if (!deleteDialogOpen && !editModalOpen) {
      setEditModalOpen(true);
    }
  };

  return (
    <Card
      className="group overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer border-0 bg-card"
      onClick={handleCardClick}
    >
      <CardHeader className="p-0">
        <div className="aspect-square bg-muted relative overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <span className="text-5xl opacity-20">📦</span>
            </div>
          )}

          {/* Overlay gradient for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          {/* Top badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5">
            <Badge
              className={`text-[10px] px-2 py-0.5 font-medium backdrop-blur-sm ${
                product.source
                  ? (sourceColors[product.source] ??
                    "bg-gray-500/10 text-gray-500")
                  : "bg-gray-500/10 text-gray-500"
              }`}
            >
              {product.source?.toLowerCase() ?? "unknown"}
            </Badge>

            {attachmentCount > 1 && (
              <Badge className="text-[10px] px-2 py-0.5 bg-black/50 text-white backdrop-blur-sm border-0">
                {attachmentCount} files
              </Badge>
            )}
          </div>

          {/* Menu button */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem onSelect={() => setEditModalOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {product.sourceUrl && (
                  <DropdownMenuItem
                    onSelect={() =>
                      product.sourceUrl &&
                      window.open(product.sourceUrl, "_blank")
                    }
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Source
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() => setDeleteDialogOpen(true)}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-2">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold leading-tight line-clamp-2">
            {product.name}
          </h3>

          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-5 font-normal"
              >
                {tag}
              </Badge>
            ))}
            {product.tags.length > 3 && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-5 font-normal"
              >
                +{product.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {(product.category || createdDate) && (
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
            {product.category && (
              <span className="truncate">{product.category}</span>
            )}
            {createdDate && <span className="shrink-0">{createdDate}</span>}
          </div>
        )}
      </CardContent>

      <CreateProductModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        product={product}
      />

      <DeleteProductDialog
        product={product}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </Card>
  );
}
