import { Button } from "@openpromo/ui/components/button";
import type { VideoGenRealtime } from "@shared";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Image, Loader2, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RiSparklingFill } from "react-icons/ri";
import { toast } from "sonner";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import { MomentumCard } from "@/components/momentum/MomentumCard";
import { useInstantAdStore } from "@/features/instant-ad/instant-ad-store";
import {
  useVideoGenAgentContext,
  VideoGenAgentProvider,
} from "@/features/instant-ad/video-gen-agent-provider";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useProductListQuery } from "@/queries/product";
import { usePresetsQuery } from "@/queries/product-visuals";
import { QuickAdPresetStrip } from "./quick-ad-preset-strip";
import { QuickAdProductGrid } from "./quick-ad-product-grid";
import { QuickAdProductModal } from "./quick-ad-product-modal";

function QuickAdCardInner() {
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
    <MomentumCard className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <RiSparklingFill className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Instant Ad</h3>
            <p className="text-xs text-muted-foreground">
              AI-powered product visuals for social
            </p>
          </div>
        </div>
        <Link
          to="/workspaces/$workspaceSlug/instant-ad"
          params={{ workspaceSlug: workspace.slug }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Full Editor
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Select Product
          </p>
          <QuickAdProductGrid
            products={products}
            selectedProductId={productId}
            onProductSelect={handleProductSelect}
            onBrowseAll={() => setIsProductModalOpen(true)}
            isLoading={isLoadingProducts}
            maxVisible={6}
          />
        </div>

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
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={() => handleGenerate("image")}
          disabled={isDisabled}
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

      <QuickAdProductModal
        open={isProductModalOpen}
        onOpenChange={setIsProductModalOpen}
        products={products}
        selectedProductId={productId}
        onProductSelect={(id) => {
          handleProductSelect(id);
          setIsProductModalOpen(false);
        }}
        isLoading={isLoadingProducts}
      />
    </MomentumCard>
  );
}

export function QuickAdCard() {
  return (
    <VideoGenAgentProvider>
      <QuickAdCardInner />
    </VideoGenAgentProvider>
  );
}
