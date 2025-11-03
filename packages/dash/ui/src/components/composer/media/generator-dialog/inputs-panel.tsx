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
import { useImageGenComposerStore } from "@/stores/image-gen-composer-store";
import { GenerateButton } from "../generate-button";
import { ProductSelect, type ProductSelectItem } from "../product-select";
import { StyleGallery, type StyleGalleryItem } from "../style-gallery";

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

  const selectedProductId = useImageGenComposerStore(
    (state) => state.selectedProductId,
  );
  const setSelectedProductId = useImageGenComposerStore(
    (state) => state.setSelectedProductId,
  );

  const selectedStyleId = useImageGenComposerStore(
    (state) => state.selectedStyleId,
  );
  const setSelectedStyleId = useImageGenComposerStore(
    (state) => state.setSelectedStyleId,
  );

  const batchCount = useImageGenComposerStore((state) => state.batchCount);
  const setBatchCount = useImageGenComposerStore(
    (state) => state.setBatchCount,
  );

  const prompt = useImageGenComposerStore((state) => state.prompt);
  const setPrompt = useImageGenComposerStore((state) => state.setPrompt);

  const referenceImageUrl = useImageGenComposerStore(
    (state) => state.referenceImageUrl,
  );
  const setReferenceImageUrl = useImageGenComposerStore(
    (state) => state.setReferenceImageUrl,
  );

  const availableSlots = Math.max(remainingSlots, 0);
  const sliderMax = availableSlots > 0 ? Math.min(availableSlots, 4) : 1;
  const resolvedBatchCount =
    batchCount > sliderMax ? sliderMax : Math.max(batchCount, 1);

  useEffect(() => {
    if (batchCount !== resolvedBatchCount) {
      setBatchCount(resolvedBatchCount);
    }
  }, [batchCount, resolvedBatchCount, setBatchCount]);

  const hasStyleContext =
    Boolean(selectedStyleId) || referenceImageUrl.trim().length > 0;
  const mode = hasStyleContext ? "style" : "studio";

  const canGenerate =
    Boolean(selectedProductId) &&
    availableSlots > 0 &&
    !generateMutation.isPending;

  const handleGenerate = () => {
    if (!selectedProductId || generateMutation.isPending) return;

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
      mode,
      batchCount: safeBatchCount,
      prompt: trimmedPrompt || undefined,
      referenceImageUrl: trimmedReference || undefined,
    });
  };

  return (
    <div
      className={cn(
        "border rounded-lg flex flex-col h-full overflow-hidden",
        className,
      )}
    >
      <div className="space-y-1 px-4 pt-4 flex-shrink-0">
        <h3 className="text-sm font-medium">Configuration</h3>
        <p className="text-xs text-muted-foreground">
          Choose a product, optional style, and customize the generation run.
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 pb-4 pt-4 space-y-4">
          <div className="space-y-3">
            {/* Product Search */}
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

            {/* Product Dropdown */}
            <ProductSelect
              products={products}
              selectedProductId={selectedProductId}
              onProductChange={setSelectedProductId}
              isLoading={isLoadingProducts}
            />
          </div>

          <StyleGallery
            styles={styles}
            selectedStyleId={selectedStyleId}
            onStyleSelect={(styleId) =>
              setSelectedStyleId(styleId === selectedStyleId ? "" : styleId)
            }
            isLoading={isLoadingStyles}
          />

          {/* Advanced Options Collapsible */}
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
                  onChange={(event) => setReferenceImageUrl(event.target.value)}
                  placeholder="Paste a reference image URL..."
                  rows={2}
                  className="resize-none font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="prompt-input"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Custom prompt
                  <span className="ml-1 font-normal text-muted-foreground/70">
                    (optional)
                  </span>
                </label>
                <Textarea
                  id="prompt-input"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Add additional instructions..."
                  rows={3}
                  className="resize-none"
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
                  <span>{mode === "style" ? "Styled run" : "Studio run"}</span>
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

          <GenerateButton
            onClick={handleGenerate}
            disabled={!canGenerate}
            isGenerating={generateMutation.isPending}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
