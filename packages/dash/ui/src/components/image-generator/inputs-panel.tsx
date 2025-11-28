import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@openpromo/ui/components/collapsible";
import { Input } from "@openpromo/ui/components/input";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Slider } from "@openpromo/ui/components/slider";
import { Textarea } from "@openpromo/ui/components/textarea";
import { cn } from "@openpromo/ui/lib/utils";
import type { UseMutationResult } from "@tanstack/react-query";
import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import type {
  ProductImageGenerateInput,
  ProductImageGenerateResponse,
} from "@/queries/product";
import { useProductVisualsVideoStartMutation } from "@/queries/video-gen";
import { useImageGeneratorStore } from "@/stores/image-generator-store";
import { GenerateButton } from "./generate-button";
import { ProductSelect, type ProductSelectItem } from "./product-select";
import { StyleGallery, type StyleGalleryItem } from "./style-gallery";

interface InputsPanelProps {
  products: ProductSelectItem[];
  styles: StyleGalleryItem[];
  isLoadingProducts: boolean;
  isLoadingStyles: boolean;
  remainingSlots: number;
  generateMutation: UseMutationResult<
    ProductImageGenerateResponse,
    Error,
    ProductImageGenerateInput,
    unknown
  >;
  productSearch: string;
  onProductSearchChange: (search: string) => void;
  className?: string;
  generationMode?: "images" | "video";
  onGenerationModeChange?: (mode: "images" | "video") => void;
}

export function InputsPanel({
  products,
  styles,
  isLoadingProducts,
  isLoadingStyles,
  remainingSlots,
  generateMutation,
  productSearch,
  onProductSearchChange,
  className,
  generationMode,
  onGenerationModeChange,
}: InputsPanelProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(productSearch);
  const [avatarImageUrl, setAvatarImageUrl] = useState("");

  // Debounce search to avoid excessive API calls
  const [debouncedSearch] = useDebounceValue(localSearch, 400);

  // Sync local search with prop changes
  useEffect(() => {
    setLocalSearch(productSearch);
  }, [productSearch]);

  // Update parent when debounced value changes
  useEffect(() => {
    onProductSearchChange(debouncedSearch.trim());
  }, [debouncedSearch, onProductSearchChange]);

  const selectedProductId = useImageGeneratorStore(
    (state) => state.selectedProductId,
  );
  const setSelectedProductId = useImageGeneratorStore(
    (state) => state.setSelectedProductId,
  );

  const selectedStyleId = useImageGeneratorStore(
    (state) => state.selectedStyleId,
  );
  const setSelectedStyleId = useImageGeneratorStore(
    (state) => state.setSelectedStyleId,
  );

  const batchCount = useImageGeneratorStore((state) => state.batchCount);
  const setBatchCount = useImageGeneratorStore((state) => state.setBatchCount);

  const prompt = useImageGeneratorStore((state) => state.prompt);
  const setPrompt = useImageGeneratorStore((state) => state.setPrompt);

  const referenceImageUrl = useImageGeneratorStore(
    (state) => state.referenceImageUrl,
  );
  const setReferenceImageUrl = useImageGeneratorStore(
    (state) => state.setReferenceImageUrl,
  );

  const videoStartMutation = useProductVisualsVideoStartMutation();

  const availableSlots = Math.max(remainingSlots, 0);
  const sliderMax = availableSlots > 0 ? Math.min(availableSlots, 4) : 1;
  const resolvedBatchCount =
    batchCount > sliderMax ? sliderMax : Math.max(batchCount, 1);

  useEffect(() => {
    if (batchCount !== resolvedBatchCount) {
      setBatchCount(resolvedBatchCount);
    }
  }, [batchCount, resolvedBatchCount, setBatchCount]);

  const isVideoMode = generationMode === "video";
  const isPending = isVideoMode
    ? videoStartMutation.isPending
    : generateMutation.isPending;

  const canGenerate = isVideoMode
    ? Boolean(selectedProductId) && Boolean(prompt.trim()) && !isPending
    : Boolean(selectedProductId) && availableSlots > 0 && !isPending;

  const handleGenerate = () => {
    if (!selectedProductId || isPending) return;

    if (isVideoMode) {
      // Video generation
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt) return;

      videoStartMutation.mutate({
        productId: selectedProductId,
        styleComponentId: selectedStyleId || undefined,
        instructions: trimmedPrompt,
        avatarImageUrl: avatarImageUrl.trim() || undefined,
      });
    } else {
      // Image generation
      const safeBatchCount =
        availableSlots > 0
          ? Math.min(batchCount, Math.min(availableSlots, 4))
          : 0;

      if (safeBatchCount <= 0) return;

      if (safeBatchCount !== batchCount) {
        setBatchCount(safeBatchCount);
      }

      const trimmedPrompt = prompt.trim();
      const trimmedReference = referenceImageUrl.trim();

      generateMutation.mutate({
        productId: selectedProductId,
        styleId: selectedStyleId || undefined,
        batchCount: safeBatchCount,
        prompt: trimmedPrompt || undefined,
        referenceImageUrl: trimmedReference || undefined,
      });
    }
  };

  const showTabs = generationMode && onGenerationModeChange;

  return (
    <div
      className={cn(
        "border rounded-lg flex flex-col h-full overflow-hidden",
        className,
      )}
    >
      {/* Fixed Header */}
      <div className="space-y-1 px-4 pt-4 pb-3 flex-shrink-0 border-b">
        <h3 className="text-sm font-medium">Configuration</h3>
        <p className="text-xs text-muted-foreground">
          Choose a product, optional style, and customize the generation run.
        </p>
        {showTabs && (
          <div className="grid grid-cols-2 mt-3 h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
            <button
              type="button"
              onClick={() => onGenerationModeChange("images")}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                generationMode === "images"
                  ? "bg-background text-foreground shadow"
                  : "hover:bg-background/50",
              )}
            >
              Images
            </button>
            <button
              type="button"
              onClick={() => onGenerationModeChange("video")}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                generationMode === "video"
                  ? "bg-background text-foreground shadow"
                  : "hover:bg-background/50",
              )}
            >
              Video
            </button>
          </div>
        )}
      </div>

      {/* Unified content for image and video */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="px-4 py-4 space-y-4">
            {/* Product Search */}
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="product-search-input"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9 pr-9"
                />
                {localSearch && (
                  <button
                    onClick={() => setLocalSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Product Dropdown */}
            <ProductSelect
              products={products}
              selectedProductId={selectedProductId}
              onProductChange={setSelectedProductId}
              isLoading={isLoadingProducts}
            />

            {/* Style Gallery with horizontal scroll */}
            <StyleGallery
              styles={styles}
              selectedStyleId={selectedStyleId}
              onStyleSelect={(styleId) =>
                setSelectedStyleId(styleId === selectedStyleId ? "" : styleId)
              }
              isLoading={isLoadingStyles}
            />

            {/* Avatar Image URL - only shown in video mode */}
            {isVideoMode && (
              <div className="space-y-1.5">
                <label
                  htmlFor="avatar-url-input"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Avatar image URL
                  <span className="ml-1 font-normal text-muted-foreground/70">
                    (optional)
                  </span>
                </label>
                <Textarea
                  id="avatar-url-input"
                  value={avatarImageUrl}
                  onChange={(event) => setAvatarImageUrl(event.target.value)}
                  placeholder="Paste avatar image URL for video presenter..."
                  rows={2}
                  className="resize-none font-mono text-xs"
                />
              </div>
            )}

            {/* Instructions/Prompt - required for video, optional for images */}
            <div className="space-y-1.5">
              <label
                htmlFor="prompt-input"
                className="text-xs font-medium text-muted-foreground"
              >
                {isVideoMode ? "Instructions" : "Custom prompt"}
                {!isVideoMode && (
                  <span className="ml-1 font-normal text-muted-foreground/70">
                    (optional)
                  </span>
                )}
              </label>
              <Textarea
                id="prompt-input"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  isVideoMode
                    ? "Describe what the video should show..."
                    : "Add additional instructions..."
                }
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Advanced Options Collapsible - only for images */}
            {!isVideoMode && (
              <Collapsible
                open={isAdvancedOpen}
                onOpenChange={setIsAdvancedOpen}
                className="space-y-2"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <span>Advanced options</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isAdvancedOpen && "rotate-180",
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="reference-url-input"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Reference image URL
                      <span className="ml-1 font-normal text-muted-foreground/70">
                        (optional)
                      </span>
                    </label>
                    <Textarea
                      id="reference-url-input"
                      value={referenceImageUrl}
                      onChange={(event) =>
                        setReferenceImageUrl(event.target.value)
                      }
                      placeholder="Paste a reference image URL..."
                      rows={2}
                      className="resize-none font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Batch size
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {resolvedBatchCount}
                      </span>
                    </div>
                    <Slider
                      value={[resolvedBatchCount]}
                      onValueChange={(value) => setBatchCount(value[0] || 1)}
                      min={1}
                      max={sliderMax}
                      step={1}
                      disabled={availableSlots <= 0}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Slots remaining: {availableSlots}</span>
                    </div>
                    {availableSlots <= 0 && (
                      <p className="text-xs text-destructive">
                        Remove existing attachments to free up slots before
                        generating more images.
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <GenerateButton
              onClick={handleGenerate}
              disabled={!canGenerate}
              isGenerating={isPending}
              idleLabel={isVideoMode ? "Generate Video" : "Generate Image"}
              generatingLabel={isVideoMode ? "Generating..." : "Generating..."}
            />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
