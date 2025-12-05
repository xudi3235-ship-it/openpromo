import { Button } from "@openpromo/ui/components/button";
import { Label } from "@openpromo/ui/components/label";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
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
import type { AssetItem } from "@/features/product-visuals-v2/product-visuals-types";

export interface InputPanelProps {
  // Mode
  mode: "image" | "video";
  onModeChange: (mode: "image" | "video") => void;

  // Status
  status: VideoGenRealtime.RunStatus;

  // Prompt
  prompt: string;
  onPromptChange: (prompt: string) => void;

  // Product
  products: ProductSelectItem[];
  selectedProductId: string | null;
  onProductChange: (id: string) => void;
  isLoadingProducts: boolean;
  productImageUrls: string[];

  // Styles
  styles: StyleGalleryItem[];
  isLoadingStyles: boolean;
  selectedStyleId: string;
  onStyleSelect: (styleId: string) => void;

  // Assets
  avatarAssets: AssetItem[];
  onAddAvatarAsset: (asset: AssetItem) => void;
  onRemoveAvatarAsset: (id: string) => void;

  referenceAssets: AssetItem[];
  onAddReferenceAsset: (asset: AssetItem) => void;
  onRemoveReferenceAsset: (id: string) => void;

  brandAssets: AssetItem[];
  onAddBrandAsset: (asset: AssetItem) => void;
  onRemoveBrandAsset: (id: string) => void;

  // Actions
  onGenerate: () => void;
  isGenerateDisabled: boolean;
  error?: Error | null;
}

export function InputPanel({
  mode,
  onModeChange,
  status,
  prompt,
  onPromptChange,
  products,
  selectedProductId,
  onProductChange,
  isLoadingProducts,
  productImageUrls,
  styles,
  isLoadingStyles,
  selectedStyleId,
  onStyleSelect,
  avatarAssets,
  onAddAvatarAsset,
  onRemoveAvatarAsset,
  referenceAssets,
  onAddReferenceAsset,
  onRemoveReferenceAsset,
  brandAssets,
  onAddBrandAsset,
  onRemoveBrandAsset,
  onGenerate,
  isGenerateDisabled,
  error,
}: InputPanelProps) {
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);
  const generateLabel = mode === "video" ? "Generate Video" : "Generate Image";

  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border bg-white">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="text-sm font-medium">Generation Settings</div>
        <div className="flex items-center gap-2">
          <StatusPill status={status} />
          <ModeToggle mode={mode} onChange={onModeChange} />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-4">
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
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="e.g., Create a professional product shot with a lifestyle background..."
              rows={3}
              className="w-full text-sm"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Product</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select a product to use in generation.
            </p>
            <ProductSelect
              products={products}
              selectedProductId={selectedProductId ?? ""}
              onProductChange={onProductChange}
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

          <div>
            <StyleGallery
              styles={styles}
              selectedStyleId={selectedStyleId}
              onStyleSelect={onStyleSelect}
              isLoading={isLoadingStyles}
              helperText="Optional"
            />
          </div>

          {/* Optional Assets Collapsible */}
          <div className="border-t pt-4">
            <button
              onClick={() => setIsAssetsOpen(!isAssetsOpen)}
              className="flex w-full items-center justify-between rounded px-2 py-2 hover:bg-gray-50 transition-colors"
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
              <div className="mt-4 space-y-5 animate-in fade-in-50 duration-200">
                <AssetInput
                  label="Avatar assets"
                  helper="Reference images for characters or models."
                  assets={avatarAssets}
                  onAdd={onAddAvatarAsset}
                  onRemove={onRemoveAvatarAsset}
                />
                <AssetInput
                  label="Reference / style assets"
                  helper="Images to guide visual style and composition."
                  assets={referenceAssets}
                  onAdd={onAddReferenceAsset}
                  onRemove={onRemoveReferenceAsset}
                />
                <AssetInput
                  label="Brand assets"
                  helper="Logos, graphics, or other branding elements."
                  assets={brandAssets}
                  onAdd={onAddBrandAsset}
                  onRemove={onRemoveBrandAsset}
                />
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="border-t px-4 py-3">
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
    </section>
  );
}
