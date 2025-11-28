import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@openpromo/ui/components/tabs";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ImageGeneratorExperience } from "@/components/image-generator/image-generator-experience";
import { ProductVideoGeneratorExperience } from "@/components/video-generator/product-video-generator-experience";
import { useImageGeneratorMutation } from "@/hooks/useImageGeneratorMutation";
import { useImageGenListQuery } from "@/queries/image-gen";
import { useProductListQuery } from "@/queries/product";
import { useStylesListQuery } from "@/queries/styles-queries";
import { useImageGeneratorStore } from "@/stores/image-generator-store";

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
  const [activeSurface, setActiveSurface] = useState<"images" | "video">(
    "images",
  );
  const [productSearch, setProductSearch] = useState("");
  const selectedProductId = useImageGeneratorStore(
    (state) => state.selectedProductId,
  );
  const selectedStyleId = useImageGeneratorStore(
    (state) => state.selectedStyleId,
  );
  const setSelectedStyleId = useImageGeneratorStore(
    (state) => state.setSelectedStyleId,
  );
  const setSelectedProductId = useImageGeneratorStore(
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
  const { data: generationsData, isPending: isPendingGenerations } =
    useImageGenListQuery({
      page: 1,
      pageSize: 12,
    });

  // Don't add to composer in product visuals context
  const generateMutation = useImageGeneratorMutation({ addToComposer: false });

  const products = productsData?.products ?? [];
  const styles = stylesData?.styles ?? [];
  const generations = generationsData?.generations ?? [];

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
    <Tabs
      value={activeSurface}
      onValueChange={(value) =>
        setActiveSurface((value as "images" | "video") ?? "images")
      }
      className="flex h-full flex-col bg-background"
    >
      <div className="flex-shrink-0 px-6 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Product Visuals
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate ready-to-use product imagery and video concepts with styles,
          prompts, and batch control.
        </p>
        <TabsList className="mt-4">
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4">
        <TabsContent value="images" className="h-full">
          <div className="h-full rounded-xl bg-card">
            <ImageGeneratorExperience
              products={products}
              styles={styles}
              isLoadingProducts={isPendingProducts}
              isLoadingStyles={isPendingStyles}
              remainingSlots={Number.POSITIVE_INFINITY}
              generateMutation={generateMutation}
              productSearch={productSearch}
              onProductSearchChange={setProductSearch}
              enableComposerActions={false}
              className="h-full min-h-0"
              generations={generations}
              isLoadingGenerations={isPendingGenerations}
            />
          </div>
        </TabsContent>

        <TabsContent value="video" className="h-full">
          <div className="h-full rounded-xl bg-card p-4">
            <ProductVideoGeneratorExperience
              products={products}
              isLoadingProducts={isPendingProducts}
              selectedProductId={selectedProductId}
              onSelectProductId={setSelectedProductId}
              styleComponentId={selectedStyleId}
            />
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}
