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
import { DeleteProductDialog } from "./delete-product-dialog";

interface ProductCardProps {
  product: ProductSelectType;
}

export function ProductCard({ product }: ProductCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
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

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="p-0">
        <div className="aspect-square bg-muted relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-4xl text-muted-foreground">📦</span>
            </div>
          )}
          <div className="absolute top-1 right-1 flex gap-1">
            <Badge
              variant="secondary"
              className={`text-[10px] px-1 py-0 h-4 ${
                product.source
                  ? (sourceColors[product.source] ??
                    "bg-gray-500/10 text-gray-500")
                  : "bg-gray-500/10 text-gray-500"
              }`}
            >
              {product.source?.toLowerCase() ?? "unknown"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{product.name}</h3>
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-0.5 mt-1">
                {product.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] px-1 py-0 h-4"
                  >
                    {tag}
                  </Badge>
                ))}
                {product.tags.length > 2 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 h-4"
                  >
                    +{product.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {product.sourceUrl && (
                <DropdownMenuItem>
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
      </CardContent>

      <DeleteProductDialog
        product={product}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </Card>
  );
}
