import { Button } from "@openpromo/ui/components/button";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Slider } from "@openpromo/ui/components/slider";
import type { VideoGenRealtime } from "@shared";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Image as ImageIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import { InputPanel } from "@/components/product-visuals-v2/input-panel";
import { ResultCard } from "@/components/product-visuals-v2/result-card";
import { RunModal } from "@/components/product-visuals-v2/run-modal";
import { useProductVisualsStore } from "@/features/product-visuals-v2/product-visuals-store";
import type { RunFeedItem } from "@/features/product-visuals-v2/product-visuals-types";
import { useOptimisticRuns } from "@/hooks/useOptimisticRuns";
import { useVideoGenAgent } from "@/hooks/useVideoGenAgent";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  useAgentRunsListQuery,
  useDeleteAgentRunsMutation,
} from "@/queries/agent-runs";
import { useProductListQuery } from "@/queries/product";
import { useStylesListQuery } from "@/queries/styles-queries";
import { useComposerStore } from "@/stores/composer-store";

const sampleProductImageUrls = [
  "https://i.pinimg.com/1200x/1e/63/b8/1e63b8168a25c2a2a4127971514d97e2.jpg",
];

const samplePrompt =
  "Create an 8s TikTok style UGC ad video. using both avatar and product image";

export const Route = createFileRoute(
  "/_authenticated/workspaces/$workspaceSlug/product-visuals-v2/",
)({
  component: ProductVisualsPage,
});

function ProductVisualsPage() {
  const { data: productsData, isPending: isLoadingProducts } =
    useProductListQuery({ pageSize: 50 });

  const { data: stylesData, isPending: isLoadingStyles } = useStylesListQuery({
    page: 1,
    officialOnly: true,
  });

  const {
    mode,
    prompt,
    productId,
    productImageUrls,
    avatarAssets,
    referenceAssets,
    brandAssets,
    setMode,
    setPrompt,
    setProductId,
    setProductImageUrls,
    addAvatarAsset,
    removeAvatarAsset,
    addReferenceAsset,
    removeReferenceAsset,
    addBrandAsset,
    removeBrandAsset,
  } = useProductVisualsStore();

  const {
    isConnected,
    startGeneration,
    serverState,
    chat: { error },
  } = useVideoGenAgent({
    userId: "product-visuals-v2",
  });

  const {
    data: feedData,
    isPending: isFeedPending,
    refetch: refetchRuns,
  } = useAgentRunsListQuery({
    page: 1,
    pageSize: 24,
  });

  const deleteRunsMutation = useDeleteAgentRunsMutation();
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const addAttachmentSpecs = useComposerStore(
    (state) => state.addAttachmentSpecs,
  );

  const [selectedRun, setSelectedRun] = useState<RunFeedItem | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());
  const [columnCount, setColumnCount] = useState<number>(4);

  const buildInput = useMemo(
    (): VideoGenRealtime.EventDataMap["set_input"] => ({
      prompt: prompt.trim() || samplePrompt,
      productImages: productImageUrls.filter(Boolean).slice(0, 3),
      avatarImages: avatarAssets.map((a) => a.url).slice(0, 3),
      referenceImages: referenceAssets.map((a) => a.url).slice(0, 3),
      brandAssets: brandAssets.map((a) => a.url).slice(0, 3),
    }),
    [avatarAssets, brandAssets, productImageUrls, prompt, referenceAssets],
  );

  // Refetch runs when a new run is created (sync_state received with runId)
  useEffect(() => {
    if (serverState.runId) {
      refetchRuns();
    }
  }, [serverState.runId, refetchRuns]);

  // Merge optimistic runs with server data
  const mergedRuns = useOptimisticRuns(
    feedData?.items,
    serverState,
    workspace.id,
  );

  const handleGenerate = useCallback(() => {
    if (!isConnected) {
      toast.error("Not connected yet");
      return;
    }
    const agentName = mode === "image" ? "image_gen_agent" : "video_gen_agent";
    const payload = buildInput;
    startGeneration(agentName, payload);
  }, [isConnected, mode, buildInput, startGeneration]);

  const handleDeleteRun = (run: RunFeedItem) => {
    deleteRunsMutation.mutate({ ids: [run.id] });
  };

  const handleToggleRunSelection = (runId: string) => {
    setSelectedRunIds((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  const handleSelectAll = useCallback(() => {
    if (selectedRunIds.size === mergedRuns.length) {
      setSelectedRunIds(new Set());
    } else {
      setSelectedRunIds(new Set(mergedRuns.map((run) => run.id)));
    }
  }, [selectedRunIds.size, mergedRuns]);

  const handleBatchDelete = () => {
    if (selectedRunIds.size === 0) return;
    deleteRunsMutation.mutate({ ids: Array.from(selectedRunIds) });
    setSelectedRunIds(new Set());
  };

  const handleBatchCreatePost = async () => {
    if (selectedRunIds.size === 0) return;

    // Get selected run objects
    const selectedRuns = mergedRuns.filter((run) => selectedRunIds.has(run.id));

    // Extract media specs from selected runs
    const attachments = selectedRuns
      .map((run) => {
        const isVideo =
          run.output.output?.videos?.[0] || run.artifacts?.videos?.[0];
        const url =
          isVideo?.videoUrl ||
          run.output.output?.images?.[0]?.imageUrl ||
          run.artifacts?.images?.[0]?.imageUrl;

        if (!url) return null;

        return {
          id: run.id,
          type: isVideo ? ("video" as const) : ("photo" as const),
          publicUrl: url,
          mimeType: isVideo ? "video/mp4" : "image/jpeg",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (attachments.length === 0) {
      toast.error("No media found to add");
      return;
    }

    // Add attachments and navigate
    addAttachmentSpecs(attachments);
    await navigate({
      to: "/workspaces/$workspaceSlug/composer",
      params: { workspaceSlug: workspace.slug },
    });

    toast.success(`${attachments.length} media added to composer`);
    setSelectedRunIds(new Set());
  };

  const productSelectItems: ProductSelectItem[] =
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
    })) ?? [];

  const styleGalleryItems: StyleGalleryItem[] = useMemo(
    () =>
      stylesData?.styles.map((style) => ({
        id: style.id,
        name: style.name ?? null,
        description: style.description ?? null,
        imageRefs: style.imageRefs ?? [],
      })) ?? [],
    [stylesData?.styles],
  );

  const handleStyleSelect = useCallback(
    (styleId: string) => {
      setSelectedStyleId(styleId);
      const style = styleGalleryItems.find((s) => s.id === styleId);
      if (!style) return;
      // Add style images to reference assets
      const styleImages = style.imageRefs.filter((url): url is string =>
        Boolean(url),
      );
      styleImages.forEach((url) => {
        addReferenceAsset({ id: url, url });
      });
    },
    [styleGalleryItems, addReferenceAsset],
  );

  const handleProductSelect = useCallback(
    (id: string) => {
      setProductId(id);
      const product = productSelectItems.find((p) => p.id === id);
      if (!product) return;
      const urls: string[] =
        product.attachments
          ?.map((a) => a.publicUrl || a.presignedUrl)
          .filter((v): v is string => Boolean(v)) ?? [];
      setProductImageUrls(urls.length > 0 ? urls : sampleProductImageUrls);
    },
    [productSelectItems, setProductId, setProductImageUrls],
  );

  // Preselect first product on load
  useEffect(() => {
    if (productSelectItems.length > 0 && !productId) {
      handleProductSelect(productSelectItems[0].id);
    }
  }, [productSelectItems, productId, handleProductSelect]);

  const getGridClass = (cols: number) => {
    const gridClasses: Record<number, string> = {
      2: "grid-cols-2",
      4: "grid-cols-4",
      6: "grid-cols-6",
    };
    return gridClasses[cols] || "grid-cols-4";
  };

  const inputPanelProps = useMemo(
    () => ({
      mode,
      onModeChange: setMode,
      status: serverState.status,
      prompt,
      onPromptChange: setPrompt,
      products: productSelectItems,
      selectedProductId: productId,
      onProductChange: handleProductSelect,
      isLoadingProducts,
      productImageUrls,
      styles: styleGalleryItems,
      isLoadingStyles,
      selectedStyleId,
      onStyleSelect: handleStyleSelect,
      avatarAssets,
      onAddAvatarAsset: addAvatarAsset,
      onRemoveAvatarAsset: removeAvatarAsset,
      referenceAssets,
      onAddReferenceAsset: addReferenceAsset,
      onRemoveReferenceAsset: removeReferenceAsset,
      brandAssets,
      onAddBrandAsset: addBrandAsset,
      onRemoveBrandAsset: removeBrandAsset,
      onGenerate: handleGenerate,
      isGenerateDisabled: !isConnected || serverState.status === "running",
      error,
    }),
    [
      mode,
      prompt,
      productSelectItems,
      productId,
      isLoadingProducts,
      productImageUrls,
      styleGalleryItems,
      isLoadingStyles,
      selectedStyleId,
      avatarAssets,
      referenceAssets,
      brandAssets,
      serverState.status,
      isConnected,
      error,
      setMode,
      setPrompt,
      handleProductSelect,
      handleStyleSelect,
      addAvatarAsset,
      removeAvatarAsset,
      addReferenceAsset,
      removeReferenceAsset,
      addBrandAsset,
      removeBrandAsset,
      handleGenerate,
    ],
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-shrink-0 px-6 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Product Visuals
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate ready-to-use product imagery and video concepts with custom
          prompts and assets.
        </p>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
          <InputPanel {...inputPanelProps} />

          <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border bg-white">
            <div className="flex items-center justify-between gap-4 border-b px-4 py-3 bg-white">
              <div>
                <h4 className="text-sm font-medium">Generated Results</h4>
                <p className="text-xs text-muted-foreground">
                  View and manage all generated visuals.
                </p>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                {/* Slider */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {columnCount} cols
                  </span>
                  <Slider
                    value={[columnCount]}
                    onValueChange={(value) => setColumnCount(value[0] || 4)}
                    min={2}
                    max={6}
                    step={2}
                    className="w-20"
                  />
                </div>

                {/* Batch actions */}
                {selectedRunIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {selectedRunIds.size} selected
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-7 text-xs"
                    >
                      {selectedRunIds.size === mergedRuns.length
                        ? "Deselect all"
                        : "Select all"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBatchCreatePost}
                      className="h-7 text-xs"
                    >
                      Create posts
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBatchDelete}
                      disabled={deleteRunsMutation.isPending}
                      className="h-7 text-xs"
                    >
                      Delete selected
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 p-4">
                {isFeedPending && (
                  <div className={`grid gap-3 ${getGridClass(columnCount)}`}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="aspect-square w-full rounded-md" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-2 w-3/4" />
                      </div>
                    ))}
                  </div>
                )}
                {!isFeedPending && mergedRuns.length === 0 && (
                  <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium">No results yet</p>
                    <p className="text-xs text-muted-foreground">
                      Generate visuals to see them in one place.
                    </p>
                  </div>
                )}
                {!isFeedPending && mergedRuns.length > 0 && (
                  <div className={`grid gap-3 ${getGridClass(columnCount)}`}>
                    {mergedRuns.map((run) => (
                      <ResultCard
                        key={run.id}
                        run={run}
                        onSelect={() => setSelectedRun(run)}
                        onDelete={handleDeleteRun}
                        isDeleting={deleteRunsMutation.isPending}
                        isSelected={selectedRunIds.has(run.id)}
                        onToggleSelect={handleToggleRunSelection}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </section>
        </div>
      </div>

      {selectedRun && (
        <RunModal run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  );
}
