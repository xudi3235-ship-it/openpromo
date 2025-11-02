import { Button } from "@openpromo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@openpromo/ui/components/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openpromo/ui/components/select";
import { Slider } from "@openpromo/ui/components/slider";
import { Spinner } from "@openpromo/ui/components/spinner";
import { Textarea } from "@openpromo/ui/components/textarea";
import { cn } from "@openpromo/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { RiAiGenerate } from "react-icons/ri";
import { toast } from "sonner";
import {
  useProductImageGenerateMutation,
  useProductListQuery,
} from "@/queries/product";
import { useStylesListQuery } from "@/queries/styles";
import { useComposerStore } from "@/stores/composer-store";
import { MEDIA_CONFIG } from "./media-section-config";
import { MediaSectionGallery } from "./media-section-gallery";

/**
 * MediaGenerateContent - Minimal, flat UI for generating product images
 * Optimized for one-click usage - just pick a product and optionally a style
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

  const getProductImage = (product: (typeof products)[number]) => {
    if (!product.attachments?.length) return null;
    const primaryAttachment = product.attachments.find(
      (a) => a.id === product.primaryAttachmentId,
    );
    const attachment = primaryAttachment || product.attachments[0];
    if (attachment?.type !== "photo") return null;
    return (
      attachment.thumbnailUrl ||
      attachment.publicUrl ||
      attachment.presignedUrl ||
      null
    );
  };

  const getStyleImage = (style: (typeof styles)[number]) => {
    return style.imageRefs?.[0] || null;
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
        <div className="space-y-1.5">
          <label
            htmlFor="product-select"
            className="text-xs font-medium text-muted-foreground"
          >
            Product
          </label>
          <Select
            value={selectedProductId}
            onValueChange={setSelectedProductId}
          >
            <SelectTrigger id="product-select" className="w-full">
              <SelectValue placeholder="Select a product...">
                {selectedProductId &&
                  (() => {
                    const product = products.find(
                      (p) => p.id === selectedProductId,
                    );
                    if (!product) return null;
                    const imageUrl = getProductImage(product);
                    return (
                      <div className="flex items-center gap-2">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.name || product.id}
                            className="w-5 h-5 object-cover rounded"
                          />
                        ) : (
                          <div className="w-5 h-5 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            ?
                          </div>
                        )}
                        <span className="text-sm truncate">
                          {product.name || product.id}
                        </span>
                      </div>
                    );
                  })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => {
                const imageUrl = getProductImage(product);
                return (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex items-center gap-2">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name || product.id}
                          className="w-6 h-6 object-cover rounded"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          ?
                        </div>
                      )}
                      <span className="text-sm">
                        {product.name || product.id}
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Style Selection - Optional, generates studio shots if empty */}
        <div className="space-y-1.5">
          <label
            htmlFor="style-select"
            className="text-xs font-medium text-muted-foreground"
          >
            Style
            <span className="font-normal ml-1 text-muted-foreground/70">
              (optional - leave empty for clean studio shots)
            </span>
          </label>
          <Select
            value={selectedStyleId}
            onValueChange={setSelectedStyleId}
            disabled={isLoadingStyles}
          >
            <SelectTrigger id="style-select" className="w-full">
              <SelectValue placeholder="Select a style...">
                {selectedStyleId &&
                  (() => {
                    const style = styles.find((s) => s.id === selectedStyleId);
                    if (!style) return null;
                    const imageUrl = getStyleImage(style);
                    return (
                      <div className="flex items-center gap-2">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={style.name || style.id}
                            className="w-5 h-5 object-cover rounded"
                          />
                        ) : (
                          <div className="w-5 h-5 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            ?
                          </div>
                        )}
                        <span className="text-sm truncate">
                          {style.name || style.id}
                        </span>
                      </div>
                    );
                  })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {styles.map((style) => {
                const imageUrl = getStyleImage(style);
                return (
                  <SelectItem key={style.id} value={style.id}>
                    <div className="flex items-center gap-2">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={style.name || style.id}
                          className="w-6 h-6 object-cover rounded"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          ?
                        </div>
                      )}
                      <span className="text-sm">{style.name || style.id}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || generateMutation.isPending}
          className="w-full"
          size="default"
        >
          {generateMutation.isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Generating...
            </>
          ) : (
            <>
              <RiAiGenerate className="mr-2 h-4 w-4" />
              Generate Image
            </>
          )}
        </Button>

        {/* Remaining Slots Info */}
        {remainingSlots > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            {remainingSlots} slot{remainingSlots === 1 ? "" : "s"} remaining
          </p>
        )}

        {/* Advanced Options - Collapsed by default */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                showAdvanced && "transform rotate-180",
              )}
            />
            Advanced options
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            {/* Reference Image URL */}
            <div className="space-y-1.5">
              <label
                htmlFor="reference-url-input"
                className="text-xs font-medium text-muted-foreground"
              >
                Reference Image URL
                <span className="font-normal ml-1 text-muted-foreground/70">
                  (optional)
                </span>
              </label>
              <Textarea
                id="reference-url-input"
                value={referenceImageUrl}
                onChange={(e) => setReferenceImageUrl(e.target.value)}
                placeholder="Paste reference image URL..."
                rows={2}
                className="resize-none font-mono text-xs"
              />
            </div>

            {/* Batch Count */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Batch Count
                </label>
                <span className="text-xs text-muted-foreground">
                  {batchCount}
                </span>
              </div>
              <Slider
                value={[batchCount]}
                onValueChange={(value) => setBatchCount(value[0] || 1)}
                min={1}
                max={Math.min(4, remainingSlots)}
                step={1}
                className="w-full"
              />
            </div>

            {/* Custom Prompt */}
            <div className="space-y-1.5">
              <label
                htmlFor="prompt-input"
                className="text-xs font-medium text-muted-foreground"
              >
                Custom Prompt
                <span className="font-normal ml-1">(optional)</span>
              </label>
              <Textarea
                id="prompt-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Add custom instructions..."
                rows={3}
                className="resize-none"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Gallery - Shows all attachments (uploaded + generated) */}
      <MediaSectionGallery />
    </div>
  );
}
