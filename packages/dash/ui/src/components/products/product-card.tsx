import type { ProductSelectType } from "@core/schemas/product.sql";
import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { cn } from "@openpromo/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, MoreHorizontal, Pencil, Trash } from "lucide-react";
import * as React from "react";
import { ImageGridCard } from "@/components/common/ImageGrid";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useProductModalStore } from "@/stores/product-modal-store";
import { DeleteProductDialog } from "./delete-product-dialog";

interface ProductCardProps {
  product: ProductSelectType;
}

export function ProductCard({ product }: ProductCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const { openModal } = useProductModalStore();
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const primaryAttachment = product.attachments.find(
    (attachment) => attachment.id === product.primaryAttachmentId,
  );
  const imageAttachment =
    primaryAttachment ??
    product.attachments.find((attachment) => attachment.type === "photo");

  const sourceStyles: Record<string, { badge: string }> = {
    MANUAL: {
      badge: "bg-zinc-500/80 text-white",
    },
    AMAZON: {
      badge: "bg-orange-500/80 text-white",
    },
    SHOPIFY: {
      badge: "bg-emerald-500/80 text-white",
    },
    ETSY: {
      badge: "bg-rose-500/80 text-white",
    },
    CUSTOM_URL: {
      badge: "bg-sky-500/80 text-white",
    },
  };

  const stateConfig = {
    not_started: {
      label: "New",
      className: "bg-zinc-500/80 text-white",
    },
    pending: {
      label: "Pending",
      className: "bg-amber-400 text-zinc-900",
    },
    processing: {
      label: "Processing",
      className: "bg-blue-500/80 text-white",
    },
    ready: {
      label: "Ready",
      className: "bg-emerald-500/80 text-white",
    },
    failed: {
      label: "Failed",
      className: "bg-red-500/80 text-white",
    },
  };

  const currentState = stateConfig[product.state];

  const imageUrl =
    imageAttachment?.type === "photo"
      ? (imageAttachment.publicUrl ?? imageAttachment.presignedUrl)
      : undefined;

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return null;
    const resolvedDate = typeof date === "string" ? new Date(date) : date;
    return resolvedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const createdDate = formatDate(product.createdAt);

  const handleCardClick = () => {
    if (deleteDialogOpen) return;

    navigate({
      to: "/workspaces/$workspaceSlug/products/$productId",
      params: {
        workspaceSlug: workspace.slug,
        productId: product.id,
      },
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardClick();
    }
  };

  return (
    <>
      <ImageGridCard
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        bordered
        aspectRatio="square"
        className="bg-muted"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-6xl opacity-30">📦</span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity duration-300 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-60" />

        <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm",
              product.source
                ? sourceStyles[product.source]?.badge
                : "bg-zinc-500/80 text-white",
            )}
          >
            {product.source?.toLowerCase() ?? "unknown"}
          </span>

          {/* Only show state badge if not ready */}
          {currentState && product.state !== "ready" && (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm",
                currentState.className,
              )}
            >
              {currentState.label}
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="pointer-events-auto h-8 w-8 translate-y-2 rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40"
              onClick={(event) => event.stopPropagation()}
            >
              <DropdownMenuItem onSelect={() => openModal(product)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {product.sourceUrl && (
                <DropdownMenuItem
                  onSelect={() =>
                    product.sourceUrl &&
                    window.open(product.sourceUrl, "_blank")
                  }
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Source
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onSelect={() => setDeleteDialogOpen(true)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-end p-4">
          <div className="translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="space-y-2 text-white">
              <div className="space-y-1">
                <h3 className="text-base font-semibold leading-tight line-clamp-2">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-sm text-white/80 line-clamp-2">
                    {product.description}
                  </p>
                )}
              </div>

              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="border border-white/25 bg-white/15 px-2 py-0 text-[11px] font-medium text-white/90 backdrop-blur-sm hover:bg-white/25"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {product.tags.length > 3 && (
                    <Badge
                      variant="secondary"
                      className="border border-white/25 bg-white/10 px-2 py-0 text-[11px] font-medium text-white/80 backdrop-blur-sm"
                    >
                      +{product.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {(product.category || createdDate) && (
                <div className="flex items-center justify-between text-xs text-white/70">
                  {product.category && (
                    <span className="truncate">{product.category}</span>
                  )}
                  {createdDate && <span>{createdDate}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </ImageGridCard>

      <DeleteProductDialog
        product={product}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}
