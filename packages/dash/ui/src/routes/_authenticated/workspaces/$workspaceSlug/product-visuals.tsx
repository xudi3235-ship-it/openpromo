import { createFileRoute } from "@tanstack/react-router";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import { ProductVisualsContent } from "@/components/product-visuals-v2/product-visuals-content";
import { useStylesListQuery } from "@/queries/styles-queries";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/product-visuals",
)({
  component: ProductVisualsPage,
});

function ProductVisualsPage() {
  const { data: stylesData, isPending: isLoadingStyles } = useStylesListQuery({
    page: 1,
    officialOnly: true,
  });

  const styleGalleryItems: StyleGalleryItem[] = stylesData?.styles ?? [];

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-shrink-0 px-6 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Product Visuals
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate ready-to-use product imagery and video concepts with custom
          prompts and assets.
        </p>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4">
        <ProductVisualsContent
          styles={styleGalleryItems}
          isLoadingStyles={isLoadingStyles}
          userId="product-visuals"
        />
      </div>
    </div>
  );
}
