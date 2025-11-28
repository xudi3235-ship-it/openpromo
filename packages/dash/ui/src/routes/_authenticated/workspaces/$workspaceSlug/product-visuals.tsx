import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageGeneratorSurface } from "@/components/image-generator/image-generator-surface";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import { ProductVisualsGallery } from "@/components/product-visuals/product-visuals-gallery";
import { useImageGeneratorMutation } from "@/hooks/useImageGeneratorMutation";
import { useWorkspaceEvents } from "@/hooks/useWorkspaceWebSocket";
import { useProductListQuery } from "@/queries/product";
import { useProductVisualsFeedQuery } from "@/queries/product-visuals";
import { useStylesListQuery } from "@/queries/styles-queries";
import { useProductVisualGeneratorStore } from "@/stores/product-visual-generator-store";

type ProductVisualsSearch = {
  styleId?: string;
  productId?: string;
};

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/product-visuals",
)({
  validateSearch: (search: Record<string, unknown>): ProductVisualsSearch => {
    return {
      styleId: (search.styleId as string) || undefined,
      productId: (search.productId as string) || undefined,
    };
  },
  component: ProductVisualsPage,
});

function ProductVisualsPage() {
  const { styleId, productId } = Route.useSearch();
  const [productSearch, setProductSearch] = useState("");

  const generationType = useProductVisualGeneratorStore(
    (state) => state.generationType,
  );
  const setGenerationType = useProductVisualGeneratorStore(
    (state) => state.setGenerationType,
  );
  const setSelectedStyleId = useProductVisualGeneratorStore(
    (state) => state.setSelectedStyleId,
  );
  const setSelectedProductId = useProductVisualGeneratorStore(
    (state) => state.setSelectedProductId,
  );

  const { data: productsData, isPending: isPendingProducts } =
    useProductListQuery({
      search: productSearch || undefined,
      pageSize: 50,
    });

  const { data: stylesData, isPending: isPendingStyles } = useStylesListQuery({
    page: 1,
    officialOnly: true,
  });

  const {
    data: feedData,
    isPending: isFeedPending,
    refetch: refetchFeed,
  } = useProductVisualsFeedQuery({
    page: 1,
    pageSize: 18,
  });

  const handleFeedRefresh = useCallback(() => {
    void refetchFeed();
  }, [refetchFeed]);

  useWorkspaceEvents({
    handlers: {
      "image_generation.updated": handleFeedRefresh,
      "video_generation.updated": handleFeedRefresh,
    },
  });

  // Don't add to composer in product visuals context
  const generateMutation = useImageGeneratorMutation({ addToComposer: false });

  const products = productsData?.products ?? [];
  const styles = stylesData?.styles ?? [];

  const productSelectItems = useMemo<ProductSelectItem[]>(
    () =>
      products.map((product) => ({
        id: product.id,
        name: product.name ?? null,
        primaryAttachmentId: product.primaryAttachmentId ?? null,
        attachments:
          product.attachments?.map((attachment) => ({
            id: attachment.id,
            type: attachment.type,
            thumbnailUrl: attachment.thumbnailUrl ?? undefined,
            publicUrl: attachment.publicUrl ?? undefined,
            presignedUrl: attachment.presignedUrl ?? undefined,
          })) ?? [],
      })),
    [products],
  );

  const styleGalleryItems = useMemo<StyleGalleryItem[]>(
    () =>
      styles.map((style) => ({
        id: style.id,
        name: style.name ?? null,
        description: style.description ?? null,
        imageRefs: style.imageRefs ?? [],
      })),
    [styles],
  );

  const feedItems = feedData?.items ?? [];

  // Pre-select style from URL param
  useEffect(() => {
    if (styleId) {
      setSelectedStyleId(styleId);
    }
  }, [styleId, setSelectedStyleId]);

  // Pre-select product from URL param
  useEffect(() => {
    if (productId) {
      setSelectedProductId(productId);
    }
  }, [productId, setSelectedProductId]);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-shrink-0 px-6 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Product Visuals
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate ready-to-use product imagery and video concepts with styles,
          prompts, and batch control.
        </p>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
          <ImageGeneratorSurface
            products={productSelectItems}
            styles={styleGalleryItems}
            isLoadingProducts={isPendingProducts}
            isLoadingStyles={isPendingStyles}
            remainingSlots={Number.POSITIVE_INFINITY}
            generateMutation={generateMutation}
            productSearch={productSearch}
            onProductSearchChange={setProductSearch}
            enableComposerActions={false}
            className="h-full"
            showGallery={false}
            generationMode={generationType}
            onGenerationModeChange={setGenerationType}
          />

          <ProductVisualsGallery
            items={feedItems}
            isLoading={isFeedPending}
            onRefetch={refetchFeed}
          />
        </div>
      </div>
    </div>
  );
}
