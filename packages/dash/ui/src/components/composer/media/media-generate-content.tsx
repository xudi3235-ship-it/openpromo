import { Button } from "@openpromo/ui/components/button";
import type { VideoGenRealtime } from "@shared";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Image, Loader2, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import { QuickAdPresetStrip } from "@/components/quick-ad/quick-ad-preset-strip";
import { QuickAdProductGrid } from "@/components/quick-ad/quick-ad-product-grid";
import { QuickAdProductModal } from "@/components/quick-ad/quick-ad-product-modal";
import { useInstantAdStore } from "@/features/instant-ad/instant-ad-store";
import {
  useVideoGenAgentContext,
  VideoGenAgentProvider,
} from "@/features/instant-ad/video-gen-agent-provider";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useProductListQuery } from "@/queries/product";
import { usePresetsQuery } from "@/queries/product-visuals";

function MediaGenerateContentInner() {
  const { workspace } = useWorkspace();
  const navigate = useNavigate();

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Store
  const {
    productId,
    productImageUrls,
    selectedVideoPresetId,
    selectProduct,
    selectVideoPreset,
  } = useInstantAdStore();

  // Agent context
  const { isConnected, activeRunId, isGenerating, startGeneration } =
    useVideoGenAgentContext();

  // Queries
  const { data: productsData, isPending: isLoadingProducts } =
    useProductListQuery({ pageSize: 50 });

  const { data: presetsData, isPending: isLoadingPresets } = usePresetsQuery();

  const products: ProductSelectItem[] = useMemo(
    () =>
      productsData?.products.map((product) => ({
        id: product.id,
        name: product.name ?? null,
        primaryAttachmentId: product.primaryAttachmentId ?? null,
        attachments:
          product.attachments?.map((attachment) => ({
            id: attachment.id,
            type: attachment.type,
            thumbnailUrl: attachment.thumbnailUrl ?? undefined,
            publicUrl: attachment.publicUrl ?? undefined,
            presignedUrl: attachment.presignedUrl ?? undefined,
          })) ?? [],
      })) ?? [],
    [productsData],
  );

  const presets = presetsData?.references ?? [];

  // Auto-select first product if none selected
  useEffect(() => {
    if (products.length > 0 && !productId) {
      selectProduct(products[0].id, products);
    }
  }, [products, productId, selectProduct]);

  // Navigate to instant-ad page when generation starts
  useEffect(() => {
    if (activeRunId) {
      navigate({
        to: "/workspaces/$workspaceSlug/instant-ad",
        params: { workspaceSlug: workspace.slug },
        search: { runId: activeRunId },
      });
    }
  }, [activeRunId, navigate, workspace.slug]);

  const handleProductSelect = useCallback(
    (id: string) => {
      selectProduct(id, products);
    },
    [selectProduct, products],
  );

  const handlePresetSelect = useCallback(
    (presetId: string) => {
      selectVideoPreset(presetId);
    },
    [selectVideoPreset],
  );

  const buildInput = useCallback(
    (mode: "image" | "video"): VideoGenRealtime.EventDataMap["set_input"] => ({
      mode: mode === "image" ? "image_gen" : "video_gen",
      prompt: "",
      productImages: productImageUrls.filter(Boolean).slice(0, 3),
      avatarImages: [],
      referenceImages: [],
      brandAssets: [],
      presetId: selectedVideoPresetId || undefined,
    }),
    [productImageUrls, selectedVideoPresetId],
  );

  const handleGenerate = useCallback(
    (mode: "image" | "video") => {
      if (!isConnected) {
        toast.error("Connecting... Please try again in a moment.");
        return;
      }
      if (!productId) {
        toast.error("Please select a product first");
        return;
      }
      startGeneration(buildInput(mode));
    },
    [isConnected, productId, buildInput, startGeneration],
  );

  const isDisabled = !isConnected || !productId || isGenerating;

  return (
    <div className="space-y-4">
      {/* Feature Description */}
      <p className="text-xs text-muted-foreground">
        Create winning ads in seconds.
      </p>

      {/* Product Selection */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Select Product
        </p>
        <QuickAdProductGrid
          products={products}
          selectedProductId={productId ?? ""}
          onProductSelect={handleProductSelect}
          onBrowseAll={() => setIsProductModalOpen(true)}
          isLoading={isLoadingProducts}
          maxVisible={4}
        />
      </div>

      {/* Style/Preset Selection */}
      {presets.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Choose Style
          </p>
          <QuickAdPresetStrip
            presets={presets}
            selectedPresetId={selectedVideoPresetId}
            onPresetSelect={handlePresetSelect}
            isLoading={isLoadingPresets}
          />
        </div>
      )}

      {/* Generate Buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => handleGenerate("image")}
          disabled={isDisabled}
          variant="outline"
          className="flex-1"
          size="sm"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Image className="h-4 w-4 mr-2" />
          )}
          Generate Image
        </Button>
        <Button
          onClick={() => handleGenerate("video")}
          disabled={isDisabled}
          variant="outline"
          className="flex-1"
          size="sm"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Video className="h-4 w-4 mr-2" />
          )}
          Generate Video
        </Button>
      </div>

      {/* Link to full editor */}
      <div className="flex justify-center">
        <Link
          to="/workspaces/$workspaceSlug/instant-ad"
          params={{ workspaceSlug: workspace.slug }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Open Full Editor
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <QuickAdProductModal
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        products={products}
        selectedProductId={productId ?? ""}
        onProductSelect={(id) => {
          handleProductSelect(id);
          setIsProductModalOpen(false);
        }}
        isLoading={isLoadingProducts}
      />
    </div>
  );
}

/**
 * MediaGenerateContent - Quick entry for AI-powered product visuals
 * Reuses the Instant Ad flow: pick product → pick style → generate
 */
export function MediaGenerateContent() {
  return (
    <VideoGenAgentProvider>
      <MediaGenerateContentInner />
    </VideoGenAgentProvider>
  );
}
