import { Button } from "@openpromo/ui/components/button";
import { Spinner } from "@openpromo/ui/components/spinner";
import { useMemo } from "react";
import { GenerateButton } from "@/components/image-generator/generate-button";
import { ProductSelect } from "@/components/image-generator/product-select";
import { StyleGallery } from "@/components/image-generator/style-gallery";
import { useImageGeneratorMutation } from "@/hooks/useImageGeneratorMutation";
import { useProductListQuery } from "@/queries/product";
import { useStylesListQuery } from "@/queries/styles-queries";
import { useComposerStore } from "@/stores/composer-store";
import { useImageGeneratorStore } from "@/stores/image-generator-store";
import { MediaGeneratorDialog } from "./generator-dialog/media-generator-dialog";
import { MEDIA_CONFIG } from "./media-section-config";
import { MediaSectionGallery } from "./media-section-gallery";

/**
 * MediaGenerateContent - Progressive UX for generating product images
 * Start simple: pick product → pick style → generate
 * Style selection automatically determines mode (studio vs styled)
 */
export function MediaGenerateContent() {
  // Store state
  const selectedProductId = useImageGeneratorStore(
    (state) => state.selectedProductId,
  );
  const selectedStyleId = useImageGeneratorStore(
    (state) => state.selectedStyleId,
  );
  const batchCount = useImageGeneratorStore((state) => state.batchCount);
  const prompt = useImageGeneratorStore((state) => state.prompt);
  const referenceImageUrl = useImageGeneratorStore(
    (state) => state.referenceImageUrl,
  );
  const setGeneratorDialogOpen = useImageGeneratorStore(
    (state) => state.setGeneratorDialogOpen,
  );

  // Store actions
  const setSelectedProductId = useImageGeneratorStore(
    (state) => state.setSelectedProductId,
  );
  const setSelectedStyleId = useImageGeneratorStore(
    (state) => state.setSelectedStyleId,
  );

  const { contentCreateData } = useComposerStore();

  // Main section product list - no search filter
  const { data: productsData, isPending: isPendingProducts } =
    useProductListQuery({});

  const { data: stylesData, isPending: isPendingStyles } = useStylesListQuery({
    page: 1,
    officialOnly: true,
  });

  const generateMutation = useImageGeneratorMutation();

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
      batchCount: safeBatchCount,
      prompt: trimmedPrompt || undefined,
      referenceImageUrl: trimmedReference || undefined,
    });
  };

  if (isPendingProducts) {
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
          isLoading={isPendingStyles}
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
        isLoadingStyles={isPendingStyles}
        remainingSlots={remainingSlots}
        generateMutation={generateMutation}
      />
    </div>
  );
}
