import { Button } from "@openpromo/ui/components/button";
import { Label } from "@openpromo/ui/components/label";
import { Textarea } from "@openpromo/ui/components/textarea";
import type { VideoGenRealtime } from "@shared";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import { ProductSelect } from "@/components/image-generator/product-select";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import { StyleGallery } from "@/components/image-generator/style-gallery";
import { AssetInput } from "@/components/product-visuals-v2/asset-input";
import { ModeToggle } from "@/components/product-visuals-v2/mode-toggle";
import { StatusPill } from "@/components/product-visuals-v2/status-pill";
import {
  type Preset,
  VideoPresets,
} from "@/components/product-visuals-v2/video-presets";
import { useProductVisualsStore } from "@/features/product-visuals-v2/product-visuals-store";

export interface InputPanelProps {
  // Status
  status: VideoGenRealtime.RunStatus;

  // Video Presets (only for video mode)
  videoPresets?: Preset[];
  isLoadingVideoPresets?: boolean;

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
  videoPresets,
  isLoadingVideoPresets,
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
  } = useProductVisualsStore();
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);
  const generateLabel = mode === "video" ? "Generate Video" : "Generate Image";

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-4">
        <h3 className="text-sm font-medium"> Settings</h3>
        <div className="flex items-center gap-2">
          <StatusPill status={status} />
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-8">
          {/* Video Presets */}
          {mode === "video" && videoPresets && (
            <div className="mx-1">
              <VideoPresets
                presets={videoPresets}
                isLoading={isLoadingVideoPresets || false}
                selectedPresetId={selectedVideoPresetId}
                onPresetSelect={(preset) => {
                  if (selectedVideoPresetId === preset.id) {
                    selectVideoPreset(undefined);
                  } else {
                    selectVideoPreset(preset.id);
                  }
                }}
              />
            </div>
          )}
          {/* Prompt Section */}
          <div>
            <Label htmlFor="prompt" className="text-sm font-medium">
              Prompt
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Describe what you want to generate.
            </p>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Create a professional product shot with a lifestyle background..."
              rows={3}
              className="w-full text-sm"
            />
          </div>

          {/* Product Section */}
          <div>
            <Label className="text-sm font-medium">Product</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select a product to use in generation.
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

          {/* Style Section */}
          <div>
            <StyleGallery
              styles={styles}
              selectedStyleId={selectedStyleId}
              onStyleSelect={(id) => selectStyle(id, styles)}
              isLoading={isLoadingStyles}
              helperText="Optional"
            />
          </div>

          {/* Optional Assets Collapsible */}
          <div className="border-t pt-6">
            <button
              onClick={() => setIsAssetsOpen(!isAssetsOpen)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-foreground">
                Additional Assets
              </span>
              <ChevronDown
                size={18}
                className={`text-muted-foreground transition-transform duration-200 ${
                  isAssetsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isAssetsOpen && (
              <div className="mt-4 space-y-6 animate-in fade-in-50 duration-200">
                <AssetInput
                  label="Avatar assets"
                  helper="Reference images for characters or models."
                  assets={avatarAssets}
                  onAdd={addAvatarAsset}
                  onRemove={removeAvatarAsset}
                />
                <AssetInput
                  label="Reference / style assets"
                  helper="Images to guide visual style and composition."
                  assets={referenceAssets}
                  onAdd={addReferenceAsset}
                  onRemove={removeReferenceAsset}
                />
                <AssetInput
                  label="Brand assets"
                  helper="Logos, graphics, or other branding elements."
                  assets={brandAssets}
                  onAdd={addBrandAsset}
                  onRemove={removeBrandAsset}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex flex-col gap-2">
          <Button onClick={onGenerate} disabled={isGenerateDisabled} size="sm">
            {generateLabel}
          </Button>
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
