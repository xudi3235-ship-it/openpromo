import type { VideoGenRealtime } from "@shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DataGrid } from "@/components/common";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import { useProductVisualsStore } from "@/features/product-visuals-v2/product-visuals-store";
import type { RunFeedItem } from "@/features/product-visuals-v2/product-visuals-types";
import { useOpenComposer } from "@/hooks/useOpenComposer";
import { useOptimisticRuns } from "@/hooks/useOptimisticRuns";
import { useVideoGenAgent } from "@/hooks/useVideoGenAgent";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  useAgentRunsListQuery,
  useDeleteAgentRunsMutation,
} from "@/queries/agent-runs";
import { useProductListQuery } from "@/queries/product";
import { InputPanel } from "./input-panel";
import { ResultCard } from "./result-card";
import { RunModal } from "./run-modal";

interface ProductVisualsContentProps {
  styles: StyleGalleryItem[];
  isLoadingStyles: boolean;
  userId?: string;
  onBatchAddedToComposer?: () => void;
  preselectedStyleId?: string;
}

const sampleProductImageUrls = [
  "https://i.pinimg.com/1200x/1e/63/b8/1e63b8168a25c2a2a4127971514d97e2.jpg",
];

const samplePrompt =
  "Create an 8s TikTok style UGC ad video. using both avatar and product image";

export function ProductVisualsContent({
  styles,
  isLoadingStyles,
  userId = "product-visuals",
  onBatchAddedToComposer,
  preselectedStyleId,
}: ProductVisualsContentProps) {
  const { workspace } = useWorkspace();
  const openComposer = useOpenComposer();

  // Product Visuals Store
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

  // Video Gen Agent
  const {
    isConnected,
    startGeneration,
    serverState,
    chat: { error },
  } = useVideoGenAgent({
    userId,
  });

  // Queries
  const { data: productsData, isPending: isLoadingProducts } =
    useProductListQuery({ pageSize: 50 });

  const {
    data: feedData,
    isPending: isFeedPending,
    refetch: refetchRuns,
  } = useAgentRunsListQuery({
    page: 1,
    pageSize: 24,
  });

  const deleteRunsMutation = useDeleteAgentRunsMutation();

  // State
  const [selectedRun, setSelectedRun] = useState<RunFeedItem | null>(null);
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);

  // Preset style on mount if preselectedStyleId is provided
  useEffect(() => {
    if (preselectedStyleId && styles.length > 0) {
      const selectedStyle = styles.find((s) => s.id === preselectedStyleId);
      if (selectedStyle) {
        // Add style images to reference assets
        const styleImages = selectedStyle.imageRefs.filter(
          (url): url is string => Boolean(url),
        );
        styleImages.forEach((url) => {
          addReferenceAsset({ id: url, url });
        });
        setSelectedStyleId(preselectedStyleId);
      }
    }
  }, [preselectedStyleId, styles, addReferenceAsset]);

  // Auto-size columns based on container width using ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      // DataGrid handles its own column sizing now
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Refetch runs when a new run is created
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

    const selectedRuns = mergedRuns.filter((run) => selectedRunIds.has(run.id));

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

    openComposer({ attachments });
    toast.success(`${attachments.length} media added to composer`);
    setSelectedRunIds(new Set());
    onBatchAddedToComposer?.();
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
      styles?.map((style) => ({
        id: style.id,
        name: style.name ?? null,
        description: style.description ?? null,
        imageRefs: style.imageRefs ?? [],
      })) ?? [],
    [styles],
  );

  const handleStyleSelect = useCallback(
    (styleId: string) => {
      setSelectedStyleId(styleId);
      const style = styleGalleryItems.find((s) => s.id === styleId);
      if (!style) return;
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

  useEffect(() => {
    if (productSelectItems.length > 0 && !productId) {
      handleProductSelect(productSelectItems[0].id);
    }
  }, [productSelectItems, productId, handleProductSelect]);

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
    <>
      <div ref={containerRef} className="flex h-full min-w-0 gap-4">
        <div className="w-96 flex-shrink-0">
          <InputPanel {...inputPanelProps} />
        </div>

        <section className="flex flex-1 min-w-0 flex-col overflow-hidden">
          <DataGrid<RunFeedItem>
            items={mergedRuns}
            isLoading={isFeedPending}
            isEmpty={mergedRuns.length === 0}
            renderItem={(run) => (
              <ResultCard
                key={run.id}
                run={run}
                onSelect={() => setSelectedRun(run)}
                onDelete={handleDeleteRun}
                isDeleting={deleteRunsMutation.isPending}
                isSelected={selectedRunIds.has(run.id)}
                onToggleSelect={handleToggleRunSelection}
              />
            )}
            header={{
              title: "Generated Results",
              description: "View and manage all generated visuals.",
            }}
            showColumnControl={true}
            defaultColumns={4}
            minColumns={2}
            maxColumns={6}
            columnStep={2}
            selectedCount={selectedRunIds.size}
            showSelectAllBtn={true}
            onSelectAllToggle={handleSelectAll}
            batchActions={[
              {
                label: "Create posts",
                onClick: handleBatchCreatePost,
              },
              {
                label: "Delete selected",
                variant: "destructive",
                onClick: handleBatchDelete,
                disabled: deleteRunsMutation.isPending,
              },
            ]}
            className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-lg border bg-white"
          />
        </section>
      </div>

      {selectedRun && (
        <RunModal run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </>
  );
}
