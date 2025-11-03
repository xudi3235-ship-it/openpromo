import { Spinner } from "@openpromo/ui/components/spinner";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useProductImageGenerateMutation,
  useProductListQuery,
} from "@/queries/product";
import { useStylesListQuery } from "@/queries/styles";
import { useComposerStore } from "@/stores/composer-store";
import { AdvancedOptions } from "./advanced-options";
import { GenerateButton } from "./generate-button";
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
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const [batchCount, setBatchCount] = useState<number>(1);
  const [prompt, setPrompt] = useState<string>("");
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const queryClient = useQueryClient();
  const { contentCreateData } = useComposerStore();

  const { data: productsData, isLoading: isLoadingProducts } =
    useProductListQuery({});

  const { data: stylesData, isLoading: isLoadingStyles } = useStylesListQuery({
    page: "1",
    officialOnly: "true",
  });

  const generateMutation = useProductImageGenerateMutation((response) => {
    queryClient.invalidateQueries({ queryKey: ["image-gen-list"] });

    // Extract image URLs and generation IDs from response
    const generatedImages = response.results
      .filter((result) => result.imageUrl)
      .map((result) => ({
        url: result.imageUrl,
        id: result.generation.id,
      }));

    if (generatedImages.length > 0) {
      // Create attachment specs directly from the generated image URLs
      const newAttachmentSpecs = generatedImages.map((img) => ({
        id: img.id,
        type: "photo" as const,
        publicUrl: img.url,
        thumbnailUrl: img.url,
        mimeType: "image/jpeg",
        s3Key: img.id,
      }));

      // Use the store's addAttachmentSpecs method to properly sync
      useComposerStore.getState().addAttachmentSpecs(newAttachmentSpecs);

      toast.success(
        `${generatedImages.length} image${generatedImages.length === 1 ? "" : "s"} generated and added`,
      );
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

  // Automatically determine mode based on whether style is provided
  const hasStyle = selectedStyleId || referenceImageUrl.trim();
  const mode = hasStyle ? "style" : "studio";

  const canGenerate = !!selectedProductId;

  const handleGenerate = () => {
    if (!canGenerate) return;

    generateMutation.mutate({
      productId: selectedProductId,
      styleId: selectedStyleId || undefined,
      mode,
      batchCount,
      prompt: prompt.trim() || undefined,
      referenceImageUrl: referenceImageUrl.trim() || undefined,
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

        {/* Generate Button */}
        <GenerateButton
          onClick={handleGenerate}
          disabled={!canGenerate || generateMutation.isPending}
          isGenerating={generateMutation.isPending}
        />

        {/* Remaining Slots Info */}
        {remainingSlots > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            {remainingSlots} slot{remainingSlots === 1 ? "" : "s"} remaining
          </p>
        )}

        {/* Advanced Options */}
        <AdvancedOptions
          isOpen={showAdvanced}
          onOpenChange={setShowAdvanced}
          referenceImageUrl={referenceImageUrl}
          onReferenceImageUrlChange={setReferenceImageUrl}
          batchCount={batchCount}
          onBatchCountChange={setBatchCount}
          maxBatchCount={Math.min(4, remainingSlots)}
          prompt={prompt}
          onPromptChange={setPrompt}
        />
      </div>

      {/* Gallery - Shows all attachments (uploaded + generated) */}
      <MediaSectionGallery />
    </div>
  );
}
