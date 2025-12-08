import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import { InstantAdRoot } from "@/components/instant-ad/instant-ad-root";
import { useStylesListQuery } from "@/queries/styles-queries";

const instantAdSearchSchema = z.object({
  styleId: z.string().optional(),
  productId: z.string().optional(),
  runId: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/instant-ad",
)({
  validateSearch: (search) => instantAdSearchSchema.parse(search),
  component: InstantAdPage,
});

function InstantAdPage() {
  const { styleId, runId } = useSearch({
    from: "/_authenticated/workspaces/$workspaceSlug/instant-ad",
  });
  const { data: stylesData, isPending: isLoadingStyles } = useStylesListQuery({
    page: 1,
    officialOnly: true,
  });

  const styleGalleryItems: StyleGalleryItem[] = stylesData?.styles ?? [];

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-shrink-0">
        <h1 className="text-lg font-semibold tracking-tight">Instant Ad</h1>
        <p className="text-sm text-muted-foreground">
          Create ready-to-publish social media ads with AI in seconds.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <InstantAdRoot
          styles={styleGalleryItems}
          isLoadingStyles={isLoadingStyles}
          preselectedStyleId={styleId}
          selectedRunId={runId}
        />
      </div>
    </div>
  );
}
