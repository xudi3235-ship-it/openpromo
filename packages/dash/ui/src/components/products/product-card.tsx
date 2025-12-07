import type { ProductSelectType } from "@core/schemas/product.sql";
import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { cn } from "@openpromo/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash,
} from "lucide-react";
import * as React from "react";
import {
  GridCard,
  GridCardActions,
  GridCardBadges,
  GridCardHoverOverlay,
  GridCardMedia,
  GridCardStateOverlay,
  GridCardTypeBadge,
} from "@/components/common";
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
      badge: "bg-white/10 text-white/80 border border-white/20",
    },
    AMAZON: {
      badge: "bg-white/10 text-white/80 border border-white/20",
    },
    SHOPIFY: {
      badge: "bg-white/10 text-white/80 border border-white/20",
    },
    ETSY: {
      badge: "bg-white/10 text-white/80 border border-white/20",
    },
    CUSTOM_URL: {
      badge: "bg-white/10 text-white/80 border border-white/20",
    },
  };

  const stateConfig = {
    not_started: {
      label: "New",
      className: "bg-white/10 text-white/80 border border-white/20",
    },
    pending: {
      label: "Pending",
      className: "bg-white/10 text-white/80 border border-white/20",
    },
    processing: {
      label: "Processing",
      className: "bg-white/10 text-white/80 border border-white/20",
    },
    ready: {
      label: "Ready",
      className: "bg-white/10 text-white/80 border border-white/20",
    },
    failed: {
      label: "Failed",
      className: "bg-white/10 text-white/80 border border-white/20",
    },
  };

  const currentState = stateConfig[product.state];

  const imageUrl =
    imageAttachment?.type === "photo"
      ? (imageAttachment.publicUrl ?? imageAttachment.presignedUrl)
      : undefined;

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

  const handleCreateImage = (event: Event) => {
    event.preventDefault();
    navigate({
      to: "/workspaces/$workspaceSlug/instant-ad",
      params: {
        workspaceSlug: workspace.slug,
      },
      search: {
        productId: product.id,
      },
    });
  };

  return (
    <>
      <GridCard
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        className="bg-muted/30"
      >
        <GridCardBadges>
          <GridCardTypeBadge
            label={product.source?.toLowerCase() ?? "unknown"}
            className={cn(
              "uppercase tracking-wide text-[10px] font-semibold",
              product.source
                ? sourceStyles[product.source]?.badge
                : "bg-zinc-500/80 text-white",
            )}
          />
          {currentState && product.state !== "ready" && (
            <GridCardTypeBadge
              label={currentState.label}
              className={cn(
                "text-[10px] font-semibold",
                currentState.className,
              )}
            />
          )}
        </GridCardBadges>

        <GridCardActions>
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
              <DropdownMenuItem onSelect={handleCreateImage}>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Image
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
        </GridCardActions>

        <GridCardMedia>
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
          <GridCardHoverOverlay>
            <div className="flex h-full flex-col justify-between p-3">
              {/* Top - Actions menu */}
              <div />

              {/* Bottom - Info */}
              <div className="space-y-2">
                <div>
                  <h3 className="text-sm font-medium text-white line-clamp-1">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="mt-0.5 text-xs text-white/70 line-clamp-1">
                      {product.description}
                    </p>
                  )}
                </div>
                {product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {product.tags.slice(0, 2).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="border border-white/20 bg-white/10 px-1 py-0 text-[9px] font-medium text-white/80 backdrop-blur-sm"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {product.tags.length > 2 && (
                      <Badge
                        variant="secondary"
                        className="border border-white/20 bg-white/10 px-1 py-0 text-[9px] font-medium text-white/80 backdrop-blur-sm"
                      >
                        +{product.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </GridCardHoverOverlay>{" "}
          {product.state === "pending" && (
            <GridCardStateOverlay state="processing" message="Pending" />
          )}
          {product.state === "processing" && (
            <GridCardStateOverlay state="processing" message="Processing" />
          )}
          {product.state === "failed" && (
            <GridCardStateOverlay state="failed" />
          )}
        </GridCardMedia>
      </GridCard>

      <DeleteProductDialog
        product={product}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}
