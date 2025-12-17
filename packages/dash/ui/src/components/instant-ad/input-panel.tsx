import { Button } from "@openpromo/ui/components/button";
import { Label } from "@openpromo/ui/components/label";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Textarea } from "@openpromo/ui/components/textarea";
import type { VideoGenRealtime } from "@shared";
import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import { ProductSelect } from "@/components/image-generator/product-select";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import { StyleGallery } from "@/components/image-generator/style-gallery";
import { AssetInput } from "@/components/instant-ad/asset-input";
import { ModeToggle } from "@/components/instant-ad/mode-toggle";
import { PresetPicker } from "@/components/instant-ad/video-presets";
import { useInstantAdStore } from "@/features/instant-ad/instant-ad-store";
import { usePresetsQuery } from "@/queries/product-visuals";

export interface InputPanelProps {
  // Status
  status: VideoGenRealtime.RunStatus;
  isConnected: boolean;

  // Product
  products: ProductSelectItem[];
  isLoadingProducts: boolean;

  // Styles
  styles: StyleGalleryItem[];
  isLoadingStyles: boolean;

  // Actions
  onGenerate: () => void;
  isGenerateDisabled: boolean;
  error?: Error | null;
}

export function InputPanel({
  status,
  isConnected,
  products,
  isLoadingProducts,
  styles,
  isLoadingStyles,
  onGenerate,
  isGenerateDisabled,
  error,
}: InputPanelProps) {
  const {
    mode,
    prompt,
    productId,
    productImageUrls,
    avatarAssets,
    referenceAssets,
    brandAssets,
    selectedStyleId,
    selectedVideoPresetId,
    setMode,
    setPrompt,
    selectStyle,
    selectVideoPreset,
    selectProduct,
    addAvatarAsset,
    removeAvatarAsset,
    addReferenceAsset,
    removeReferenceAsset,
    addBrandAsset,
    removeBrandAsset,
  } = useInstantAdStore();
  const [isStyleOpen, setIsStyleOpen] = useState(true);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isMoreOptionsOpen, setIsMoreOptionsOpen] = useState(false);
  const generateLabel = mode === "video" ? "Generate Video" : "Generate Image";

  // Fetch references
  const { data: presetsData, isPending: isLoadingPresets } = usePresetsQuery();
  const references = presetsData?.references ?? [];

  // Determine button state and label
  const isRunning = status === "running";
  const buttonLabel = !isConnected
    ? "Connecting..."
    : isRunning
      ? "Generating..."
      : generateLabel;

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <h3 className="text-sm font-medium">Settings</h3>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1 min-h-0" feather>
        <div className="py-2 space-y-6">
          {/* 1. Product Section - FIRST: What are you selling? */}
          <div className="px-3">
            <Label className="text-sm font-medium">Your Product</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Choose the product you're selling that will be featured in your
              ad.
            </p>
            <ProductSelect
              products={products}
              selectedProductId={productId ?? ""}
              onProductChange={(id) => selectProduct(id, products)}
              isLoading={isLoadingProducts}
            />
            {productImageUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {productImageUrls.map((url) => (
                  <div
                    key={url}
                    className="relative aspect-square overflow-hidden rounded border bg-gray-100"
                  >
                    <img
                      src={url}
                      alt="Product"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Style/Preset Section - SECOND: How should it look? */}
          <div>
            <Button
              onClick={() => setIsStyleOpen(!isStyleOpen)}
              variant="ghost"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 h-auto"
            >
              <span className="text-sm font-medium text-foreground">
                Choose a Style
              </span>
              <ChevronDown
                size={18}
                className={`text-muted-foreground transition-transform duration-200 ${
                  isStyleOpen ? "rotate-180" : ""
                }`}
              />
            </Button>

            {isStyleOpen && (
              <div className="mt-2 px-3 animate-in fade-in-50 duration-200">
                <PresetPicker
                  references={references}
                  isLoading={isLoadingPresets}
                  selectedReferenceId={selectedVideoPresetId}
                  onReferenceSelect={(ref) => {
                    if (selectedVideoPresetId === ref.id) {
                      selectVideoPreset(undefined);
                    } else {
                      selectVideoPreset(ref.id);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* 3. Custom Instructions - THIRD: Optional fine-tuning */}
          <div>
            <Button
              onClick={() => setIsPromptOpen(!isPromptOpen)}
              variant="ghost"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 h-auto"
            >
              <span className="text-sm font-medium text-foreground">
                Custom Instructions{" "}
                <span className="text-muted-foreground font-normal">
                  (Optional)
                </span>
              </span>
              <ChevronDown
                size={18}
                className={`text-muted-foreground transition-transform duration-200 ${
                  isPromptOpen ? "rotate-180" : ""
                }`}
              />
            </Button>

            {isPromptOpen && (
              <div className="mt-3 px-3 animate-in fade-in-50 duration-200">
                <p className="text-xs text-muted-foreground mb-2">
                  Add specific directions. Most users find styles work great on
                  their own.
                </p>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Add a sunset background, make it more vibrant, focus on the texture..."
                  rows={3}
                  className="w-full text-sm"
                />
              </div>
            )}
          </div>

          {/* 4. More Options - FOURTH: Power user features */}
          <div>
            <Button
              onClick={() => setIsMoreOptionsOpen(!isMoreOptionsOpen)}
              variant="ghost"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 h-auto"
            >
              <span className="text-sm font-medium text-foreground">
                More Options
              </span>
              <ChevronDown
                size={18}
                className={`text-muted-foreground transition-transform duration-200 ${
                  isMoreOptionsOpen ? "rotate-180" : ""
                }`}
              />
            </Button>

            {isMoreOptionsOpen && (
              <div className="mt-3 px-3 space-y-6 animate-in fade-in-50 duration-200">
                {/* Visual Style Gallery */}
                <div>
                  <Label className="text-sm font-medium">Visual Style</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Apply a specific visual aesthetic to your generation.
                  </p>
                  <StyleGallery
                    styles={styles}
                    selectedStyleId={selectedStyleId}
                    onStyleSelect={(id) => selectStyle(id, styles)}
                    isLoading={isLoadingStyles}
                    helperText="Optional"
                  />
                </div>

                <AssetInput
                  label="Avatar Assets"
                  helper="Reference images for characters, models, or people."
                  assets={avatarAssets}
                  onAdd={addAvatarAsset}
                  onRemove={removeAvatarAsset}
                />
                <AssetInput
                  label="Reference Assets"
                  helper="Images to guide visual style and composition."
                  assets={referenceAssets}
                  onAdd={addReferenceAsset}
                  onRemove={removeReferenceAsset}
                />
                <AssetInput
                  label="Brand Assets"
                  helper="Logos, graphics, or branding elements to incorporate."
                  assets={brandAssets}
                  onAdd={addBrandAsset}
                  onRemove={removeBrandAsset}
                />
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Generate Button */}
      <div>
        <Button
          onClick={onGenerate}
          size="lg"
          disabled={isGenerateDisabled}
          className="w-full"
        >
          {(!isConnected || isRunning) && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {buttonLabel}
        </Button>
        {error && (
          <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error.message}
          </div>
        )}
      </div>
    </div>
  );
}
