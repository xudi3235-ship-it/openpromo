import { Button } from "@openpromo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@openpromo/ui/components/collapsible";
import { Input } from "@openpromo/ui/components/input";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Slider } from "@openpromo/ui/components/slider";
import { Spinner } from "@openpromo/ui/components/spinner";
import { Textarea } from "@openpromo/ui/components/textarea";
import { cn } from "@openpromo/ui/lib/utils";
import type { UseMutationResult } from "@tanstack/react-query";
import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import type {
  ProductImageGenerateInput,
  ProductImageGenerateResponse,
} from "@/queries/product";
import { useProductVisualsVideoStartMutation } from "@/queries/video-gen";
import { useProductVisualGeneratorStore } from "@/stores/product-visual-generator-store";
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
  isVariationPending?: boolean;
  onConfirmVariation?: () => void;
  onCancelVariation?: () => void;
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
  isVariationPending = false,
  onConfirmVariation,
  onCancelVariation,
}: InputsPanelProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(productSearch);

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

  const selectedProductId = useProductVisualGeneratorStore(
    (state) => state.selectedProductId,
  );
  const setSelectedProductId = useProductVisualGeneratorStore(
    (state) => state.setSelectedProductId,
  );

  const selectedStyleId = useProductVisualGeneratorStore(
    (state) => state.selectedStyleId,
  );
  const setSelectedStyleId = useProductVisualGeneratorStore(
    (state) => state.setSelectedStyleId,
  );

  const batchCount = useProductVisualGeneratorStore(
    (state) => state.batchCount,
  );
  const setBatchCount = useProductVisualGeneratorStore(
    (state) => state.setBatchCount,
  );

  const prompt = useProductVisualGeneratorStore((state) => state.prompt);
  const setPrompt = useProductVisualGeneratorStore((state) => state.setPrompt);

  const referenceImageUrl = useProductVisualGeneratorStore(
    (state) => state.referenceImageUrl,
  );
  const setReferenceImageUrl = useProductVisualGeneratorStore(
    (state) => state.setReferenceImageUrl,
  );

  const avatarImageUrl = useProductVisualGeneratorStore(
    (state) => state.avatarImageUrl,
  );
  const setAvatarImageUrl = useProductVisualGeneratorStore(
    (state) => state.setAvatarImageUrl,
  );
  const selectedItemForVariation = useProductVisualGeneratorStore(
    (state) => state.selectedItemForVariation,
  );
  const variationPrompt = useProductVisualGeneratorStore(
    (state) => state.variationPrompt,
  );
  const setVariationPrompt = useProductVisualGeneratorStore(
    (state) => state.setVariationPrompt,
  );
  const isVariationMode = Boolean(selectedItemForVariation);
  const variationPromptRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isVariationMode) {
      variationPromptRef.current?.focus();
    }
  }, [isVariationMode]);

  const lockedProduct = selectedItemForVariation
    ? products.find(
        (product) => product.id === selectedItemForVariation.productId,
      )
    : undefined;
  const lockedStyle = selectedItemForVariation
    ? styles.find(
        (style) => style.id === selectedItemForVariation.styleComponentId,
      )
    : undefined;
  const variationProductLabel =
    lockedProduct?.name ||
    lockedProduct?.id ||
    selectedItemForVariation?.productId;
  const variationStyleLabel =
    lockedStyle?.name ||
    lockedStyle?.id ||
    selectedItemForVariation?.styleComponentId;
  const variationSourcePrompt =
    selectedItemForVariation?.type === "image"
      ? selectedItemForVariation.prompt
      : undefined;
  const helperText = isVariationMode
    ? "Product and style locked while editing a variation"
    : undefined;

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

  const canGenerate =
    !isVariationMode &&
    (isVideoMode
      ? Boolean(selectedProductId) && Boolean(prompt.trim()) && !isPending
      : Boolean(selectedProductId) && availableSlots > 0 && !isPending);

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
            {isVariationMode && selectedItemForVariation && (
              <div className="space-y-3 rounded-lg border border-primary/40 bg-background/90 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Variation mode
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Product and style are locked while you edit this image.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[80px_1fr]">
                  <div className="h-20 w-full overflow-hidden rounded-md bg-muted">
                    {selectedItemForVariation.previewUrl ? (
                      <img
                        src={selectedItemForVariation.previewUrl}
                        alt="Selected variation"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Preview unavailable
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Source image
                    </p>
                    <p className="font-medium">
                      {variationProductLabel || "Unknown product"}
                    </p>
                    {variationStyleLabel && (
                      <p className="text-xs text-muted-foreground">
                        Style: {variationStyleLabel}
                      </p>
                    )}
                    {variationSourcePrompt && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        "{variationSourcePrompt}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="variation-prompt-input"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Variation prompt
                  </label>
                  <Textarea
                    id="variation-prompt-input"
                    ref={variationPromptRef}
                    value={variationPrompt}
                    onChange={(event) => setVariationPrompt(event.target.value)}
                    placeholder="Add additional guidance for this variation..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelVariation?.()}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onConfirmVariation?.()}
                    disabled={isVariationPending}
                    type="button"
                  >
                    {isVariationPending ? (
                      <span className="flex items-center gap-2">
                        <Spinner className="h-3 w-3" />
                        Creating variation…
                      </span>
                    ) : (
                      "Create variation"
                    )}
                  </Button>
                </div>
              </div>
            )}

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
              disabled={isVariationMode}
              helperText={helperText}
            />

            {/* Style Gallery with horizontal scroll */}
            <StyleGallery
              styles={styles}
              selectedStyleId={selectedStyleId}
              onStyleSelect={(styleId) =>
                setSelectedStyleId(styleId === selectedStyleId ? "" : styleId)
              }
              isLoading={isLoadingStyles}
              disabled={isVariationMode}
              helperText={helperText}
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
            {!isVariationMode && (
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
            )}

            {/* Advanced Options Collapsible - only for images */}
            {!isVideoMode && !isVariationMode && (
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
