import { Button } from "@openpromo/ui/components/button";
import { Spinner } from "@openpromo/ui/components/spinner";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import {
  useProductImageGenerateMutation,
  useProductListQuery,
} from "@/queries/product";
import { useStylesListQuery } from "@/queries/styles";
import { useComposerStore } from "@/stores/composer-store";
import { useImageGenComposerStore } from "@/stores/image-gen-composer-store";
import { GenerateButton } from "./generate-button";
import { MediaGeneratorDialog } from "./generator-dialog/media-generator-dialog";
import { MEDIA_CONFIG } from "./media-section-config";
import { MediaSectionGallery } from "./media-section-gallery";
import { ProductSelect } from "./product-select";
import { StyleGallery } from "./style-gallery";

/**
 * MediaGenerateContent - Progressive UX for generating product images
 * Start simple: pick product → pick style → generate
 * Style selection automatically determines mode (studio vs styled)
 */
export function MediaGenerateContent() {
  // Store state
  const selectedProductId = useImageGenComposerStore(
    (state) => state.selectedProductId,
  );
  const selectedStyleId = useImageGenComposerStore(
    (state) => state.selectedStyleId,
  );
  const batchCount = useImageGenComposerStore((state) => state.batchCount);
  const prompt = useImageGenComposerStore((state) => state.prompt);
  const referenceImageUrl = useImageGenComposerStore(
    (state) => state.referenceImageUrl,
  );
  const setGeneratorDialogOpen = useImageGenComposerStore(
    (state) => state.setGeneratorDialogOpen,
  );

  // Store actions
  const setSelectedProductId = useImageGenComposerStore(
    (state) => state.setSelectedProductId,
  );
  const setSelectedStyleId = useImageGenComposerStore(
    (state) => state.setSelectedStyleId,
  );

  const queryClient = useQueryClient();
  const { contentCreateData } = useComposerStore();

  // Main section product list - no search filter
  const { data: productsData, isLoading: isLoadingProducts } =
    useProductListQuery({});

  const { data: stylesData, isLoading: isLoadingStyles } = useStylesListQuery({
    page: "1",
    officialOnly: "true",
  });

  const generateMutation = useProductImageGenerateMutation((data) => {
    // Invalidate the query to refresh the list
    queryClient.invalidateQueries({ queryKey: ["image-gen-list"] });

    // Check if response is async or sync
    const isAsync = "async" in data && data.async === true;

    if (isAsync) {
      // Async mode - images will come via WebSocket
      // Don't auto-add, let users select from dialog when ready
      toast.success("Generating images... Check the gallery for results.");
    } else {
      // Sync mode - images are ready immediately, auto-add to composer
      const imagesToAdd = data.results
        .filter((result) => result.imageUrl && result.generation)
        .map((result) => ({
          id: result.generation.id,
          type: "photo" as const,
          publicUrl: result.imageUrl!,
          thumbnailUrl: result.imageUrl!,
          mimeType: "image/jpeg",
          s3Key: result.generation.id,
        }));

      if (imagesToAdd.length > 0) {
        useComposerStore.getState().addAttachmentSpecs(imagesToAdd);
        toast.success(
          `Added ${imagesToAdd.length} image${imagesToAdd.length === 1 ? "" : "s"} to your post!`,
        );
      }
    }
  });

  const products = productsData?.products || [];
  const styles = stylesData?.styles || [];

  const attachments = useMemo(
    () => contentCreateData.base.attachments ?? [],
    [contentCreateData.base.attachments],
  );

  const remainingSlots = Math.max(
    MEDIA_CONFIG.maxFiles - attachments.length,
    0,
  );

  const hasStyle = selectedStyleId || referenceImageUrl.trim().length > 0;
  const mode = hasStyle ? "style" : "studio";

  const canGenerate =
    Boolean(selectedProductId) &&
    remainingSlots > 0 &&
    !generateMutation.isPending;

  const handleQuickGenerate = () => {
    if (!selectedProductId || remainingSlots <= 0) return;

    const safeBatchCount = Math.max(
      1,
      Math.min(batchCount || 1, Math.min(remainingSlots, 4)),
    );

    const trimmedPrompt = prompt.trim();
    const trimmedReference = referenceImageUrl.trim();

    generateMutation.mutate({
      productId: selectedProductId,
      styleId: selectedStyleId || undefined,
      mode,
      batchCount: safeBatchCount,
      prompt: trimmedPrompt || undefined,
      referenceImageUrl: trimmedReference || undefined,
    });
  };

  if (isLoadingProducts) {
    return (
      <div className="flex items-center justify-center py-12 border rounded-lg">
        <div className="text-center space-y-3">
          <Spinner className="h-6 w-6 mx-auto" />
          <p className="text-sm text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Generation Form Card */}
      <div className="space-y-4 p-4 border rounded-lg bg-background">
        {/* Product Selection */}
        <ProductSelect
          products={products}
          selectedProductId={selectedProductId}
          onProductChange={setSelectedProductId}
        />

        {/* Style Selection */}
        <StyleGallery
          styles={styles}
          selectedStyleId={selectedStyleId}
          onStyleSelect={setSelectedStyleId}
          isLoading={isLoadingStyles}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <GenerateButton
            onClick={handleQuickGenerate}
            disabled={!canGenerate}
            isGenerating={generateMutation.isPending}
            className="sm:flex-1"
          />
          <Button
            onClick={() => setGeneratorDialogOpen(true)}
            className="w-full sm:flex-none sm:w-[160px]"
            variant="outline"
          >
            More options
          </Button>
        </div>

        {/* Remaining Slots Info */}
        {remainingSlots > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            {remainingSlots} slot{remainingSlots === 1 ? "" : "s"} remaining
          </p>
        )}
        <p className="text-xs text-center text-muted-foreground">
          Use quick generate for a fast run or open more options to customize
          prompts, batches, and monitor progress.
        </p>
      </div>

      {/* Gallery - Shows all attachments (uploaded + generated) */}
      <MediaSectionGallery />

      <MediaGeneratorDialog
        styles={styles}
        isLoadingStyles={isLoadingStyles}
        remainingSlots={remainingSlots}
        generateMutation={generateMutation}
      />
    </div>
  );
}
