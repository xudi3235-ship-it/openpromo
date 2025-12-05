import { Button } from "@openpromo/ui/components/button";
import { Label } from "@openpromo/ui/components/label";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Textarea } from "@openpromo/ui/components/textarea";
import type { VideoGenRealtime } from "@shared";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import { ProductSelect } from "@/components/image-generator/product-select";
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
  const generateLabel = mode === "video" ? "Generate Video" : "Generate Image";

  return (
    <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border bg-white">
      <div className="flex items-center justify-between gap-2 border-b p-4">
        <div className="font-medium">Configuration</div>
        <div className="flex items-center gap-2">
          <StatusPill status={status} />
          <ModeToggle mode={mode} onChange={onModeChange} />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <div>
            <Label htmlFor="prompt">Prompt / Instructions</Label>
            <p className="text-xs text-muted-foreground">
              Keep it concise; works for both images and video.
            </p>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              rows={3}
              className="w-full"
            />
          </div>

          <div>
            <Label>Product</Label>
            <p className="text-xs text-muted-foreground">
              Select a product to autofill image URLs.
            </p>
            <ProductSelect
              products={products}
              selectedProductId={selectedProductId ?? ""}
              onProductChange={onProductChange}
              isLoading={isLoadingProducts}
            />
            {productImageUrls.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {productImageUrls.map((url) => (
                  <div
                    key={url}
                    className="relative aspect-square overflow-hidden rounded-md border"
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

          <AssetInput
            label="Avatar assets (optional)"
            helper="Upload or paste URLs for presenters or characters."
            assets={avatarAssets}
            onAdd={onAddAvatarAsset}
            onRemove={onRemoveAvatarAsset}
          />
          <AssetInput
            label="Reference / style assets (optional)"
            helper="Upload or paste URLs for style cues."
            assets={referenceAssets}
            onAdd={onAddReferenceAsset}
            onRemove={onRemoveReferenceAsset}
          />
          <AssetInput
            label="Brand assets (optional)"
            helper="Logos or overlays to stay on-brand."
            assets={brandAssets}
            onAdd={onAddBrandAsset}
            onRemove={onRemoveBrandAsset}
          />
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex flex-col gap-2">
          <Button onClick={onGenerate} disabled={isGenerateDisabled}>
            {generateLabel}
          </Button>
          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error.message}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
