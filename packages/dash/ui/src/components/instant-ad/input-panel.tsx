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
import { AssetInput } from "@/components/instant-ad/asset-input";
import { ModeToggle } from "@/components/instant-ad/mode-toggle";
import { StatusPill } from "@/components/instant-ad/status-pill";
import {
  type Preset,
  VideoPresets,
} from "@/components/instant-ad/video-presets";
import { useInstantAdStore } from "@/features/instant-ad/instant-ad-store";

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
  } = useInstantAdStore();
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
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
          {/* Custom Prompt Collapsible */}
          <div className="mx-1">
            <Button
              onClick={() => setIsPromptOpen(!isPromptOpen)}
              variant="ghost"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 h-auto"
            >
              <span className="text-sm font-medium text-foreground">
                Custom Prompt{" "}
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
              <div className="mt-4 animate-in fade-in-50 duration-200">
                <p className="text-xs text-muted-foreground mb-2">
                  Add specific instructions. Most users find presets work great
                  on their own.
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

          {/* Product Section */}
          <div>
            <Label className="text-sm font-medium">
              Step 2. Select Product
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Choose the product you're selling that will be featured in your
              creative content.
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

          {/* Optional Assets Collapsible */}
          <div className="pt-6">
            <Button
              onClick={() => setIsAssetsOpen(!isAssetsOpen)}
              variant="ghost"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 h-auto"
            >
              <span className="text-sm font-medium text-foreground">
                Advanced
              </span>
              <ChevronDown
                size={18}
                className={`text-muted-foreground transition-transform duration-200 ${
                  isAssetsOpen ? "rotate-180" : ""
                }`}
              />
            </Button>

            {isAssetsOpen && (
              <div className="mt-4 space-y-6 animate-in fade-in-50 duration-200">
                {/* Style Section */}
                <div>
                  <Label className="text-sm font-medium">Style</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Choose a visual style to apply to your generation.
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
                  helper="Reference images for characters, models, or people to influence the generation."
                  assets={avatarAssets}
                  onAdd={addAvatarAsset}
                  onRemove={removeAvatarAsset}
                />
                <AssetInput
                  label="Reference Assets"
                  helper="Images to guide visual style, composition, and artistic direction."
                  assets={referenceAssets}
                  onAdd={addReferenceAsset}
                  onRemove={removeReferenceAsset}
                />
                <AssetInput
                  label="Brand Assets"
                  helper="Logos, graphics, fonts, or other branding elements to incorporate."
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
      <div className="mt-6 pt-4">
        <Label className="text-sm font-medium mb-2 block">
          Step 3. Generate Video
        </Label>
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
