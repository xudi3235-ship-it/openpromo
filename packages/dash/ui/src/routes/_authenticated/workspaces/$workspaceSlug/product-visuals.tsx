import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ImageGeneratorSurface } from "@/components/image-generator/image-generator-surface";
import { useImageGeneratorMutation } from "@/hooks/useImageGeneratorMutation";
import { useProductListQuery } from "@/queries/product";
import { useStylesListQuery } from "@/queries/styles-queries";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/product-visuals",
)({
  component: ProductVisualsPage,
});

function ProductVisualsPage() {
  const [productSearch, setProductSearch] = useState("");
  const { data: productsData, isPending: isPendingProducts } =
    useProductListQuery({
      search: productSearch || undefined,
    });

  const { data: stylesData, isPending: isPendingStyles } = useStylesListQuery({
    page: 1,
    officialOnly: true,
  });

  const generateMutation = useImageGeneratorMutation();

  const products = productsData?.products ?? [];
  const styles = stylesData?.styles ?? [];

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b px-6 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Product Visuals
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate ready-to-use product imagery and video concepts with styles,
          prompts, and batch control.
        </p>
      </div>

      <div className="flex-1 px-4 pb-6 pt-4 lg:px-6">
        <div className="h-full rounded-xl border bg-card p-4 lg:p-6">
          <ImageGeneratorSurface
            products={products}
            styles={styles}
            isLoadingProducts={isPendingProducts}
            isLoadingStyles={isPendingStyles}
            remainingSlots={Number.POSITIVE_INFINITY}
            generateMutation={generateMutation}
            productSearch={productSearch}
            onProductSearchChange={setProductSearch}
            className="h-full min-h-0"
          />
        </div>
      </div>
    </div>
  );
}
