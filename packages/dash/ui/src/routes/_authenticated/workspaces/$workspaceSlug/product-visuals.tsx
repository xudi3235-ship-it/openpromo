import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import { ProductVisualsContent } from "@/components/product-visuals-v2/product-visuals-content";
import { useStylesListQuery } from "@/queries/styles-queries";

const productVisualsSearchSchema = z.object({
  styleId: z.string().optional(),
  productId: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/product-visuals",
)({
  validateSearch: (search) => productVisualsSearchSchema.parse(search),
  component: ProductVisualsPage,
});

function ProductVisualsPage() {
  const { styleId } = useSearch({
    from: "/_authenticated/workspaces/$workspaceSlug/product-visuals",
  });
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
          preselectedStyleId={styleId}
        />
      </div>
    </div>
  );
}
