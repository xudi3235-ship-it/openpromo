import type { VideoGenRealtime } from "@shared";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DataGrid } from "@/components/common";
import type { ProductSelectItem } from "@/components/image-generator/product-select";
import type { StyleGalleryItem } from "@/components/image-generator/style-gallery";
import { useInstantAdStore } from "@/features/instant-ad/instant-ad-store";
import type { RunFeedItem } from "@/features/instant-ad/instant-ad-types";
import { useOpenComposer } from "@/hooks/useOpenComposer";
import { useOptimisticRuns } from "@/hooks/useOptimisticRuns";
import { useVideoGenAgent } from "@/hooks/useVideoGenAgent";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  useAgentRunsListQuery,
  useDeleteAgentRunsMutation,
} from "@/queries/agent-runs";
import { useProductListQuery } from "@/queries/product";
import { useVideoPresetsQuery } from "@/queries/product-visuals";
import { ConfirmDialog } from "../confirm-dialog";
import { InputPanel } from "./input-panel";
import { ResultCard } from "./result-card";
import { RunDetailView } from "./run-detail-view";

interface ProductVisualsContentProps {
  styles: StyleGalleryItem[];
  isLoadingStyles: boolean;
  userId?: string;
  onBatchAddedToComposer?: () => void;
  preselectedStyleId?: string;
  selectedRunId?: string;
}

const samplePrompt =
  "Create an 8s TikTok style UGC ad video. using both avatar and product image";

export function InstantAdRoot({
  styles,
  isLoadingStyles,
  onBatchAddedToComposer,
  preselectedStyleId,
  selectedRunId,
}: ProductVisualsContentProps) {
  const { workspace } = useWorkspace();
  const openComposer = useOpenComposer();
  const navigate = useNavigate();

  // Product Visuals Store
  const {
    mode,
    prompt,
    productId,
    productImageUrls,
    avatarAssets,
    referenceAssets,
    brandAssets,
    selectedVideoPresetId,
    selectStyle,
    selectProduct,
  } = useInstantAdStore();

  // Video Gen Agent
  const {
    isConnected,
    startGeneration,
    serverState,
    resetState,
    chat: { error },
  } = useVideoGenAgent({});

  // Queries
  const { data: productsData, isPending: isLoadingProducts } =
    useProductListQuery({ pageSize: 50 });

  const { data: videoPresetsData, isPending: isLoadingVideoPresets } =
    useVideoPresetsQuery();

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
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [showConfirmGenerateDialog, setShowConfirmGenerateDialog] =
    useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Preset style on mount if preselectedStyleId is provided
  useEffect(() => {
    if (preselectedStyleId && styles.length > 0) {
      selectStyle(preselectedStyleId, styles);
    }
  }, [preselectedStyleId, styles, selectStyle]);

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

  // Navigate to detail view when a new run is created
  useEffect(() => {
    if (serverState.runId) {
      refetchRuns();
      // Navigate to the detail view for the new run
      navigate({
        to: "/workspaces/$workspaceSlug/instant-ad",
        params: { workspaceSlug: workspace.slug },
        search: (prev) => ({ ...prev, runId: serverState.runId || undefined }),
      });
    }
  }, [serverState.runId, refetchRuns, navigate, workspace.slug]);

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
      presetId: selectedVideoPresetId || undefined,
    }),
    [
      avatarAssets,
      brandAssets,
      productImageUrls,
      prompt,
      referenceAssets,
      selectedVideoPresetId,
    ],
  );

  const handleGenerate = useCallback(() => {
    if (!isConnected) {
      toast.error("Not connected yet");
      return;
    }
    if (serverState.status === "running") {
      setShowConfirmGenerateDialog(true);
      return;
    }
    const agentName = mode === "image" ? "image_gen_agent" : "video_gen_agent";
    const payload = buildInput;
    startGeneration(agentName, payload);
  }, [isConnected, mode, buildInput, startGeneration, serverState.status]);

  const handleConfirmGenerate = () => {
    resetState();
    const agentName = mode === "image" ? "image_gen_agent" : "video_gen_agent";
    const payload = buildInput;
    startGeneration(agentName, payload);
    setShowConfirmGenerateDialog(false);
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
    setShowBatchDeleteDialog(true);
  };

  const handleConfirmBatchDelete = async () => {
    try {
      await deleteRunsMutation.mutateAsync({ ids: Array.from(selectedRunIds) });
      setSelectedRunIds(new Set());
      setShowBatchDeleteDialog(false);
    } catch (error) {
      // Keep dialog open if deletion fails
      console.error("Failed to delete items:", error);
    }
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
          source: "remote" as const,
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

  const handleProductSelect = useCallback(
    (id: string) => {
      selectProduct(id, productSelectItems);
    },
    [selectProduct, productSelectItems],
  );

  useEffect(() => {
    if (productSelectItems.length > 0 && !productId) {
      handleProductSelect(productSelectItems[0].id);
    }
  }, [productSelectItems, productId, handleProductSelect]);

  const inputPanelProps = useMemo(
    () => ({
      status: serverState.status,
      videoPresets: videoPresetsData?.presets,
      isLoadingVideoPresets,
      products: productSelectItems,
      isLoadingProducts,
      styles: styleGalleryItems,
      isLoadingStyles,
      onGenerate: handleGenerate,
      isGenerateDisabled: !isConnected || serverState.status === "running",
      error,
    }),
    [
      serverState.status,
      videoPresetsData,
      isLoadingVideoPresets,
      productSelectItems,
      isLoadingProducts,
      styleGalleryItems,
      isLoadingStyles,
      handleGenerate,
      isConnected,
      error,
    ],
  );

  // Update click handler to navigate instead of opening modal
  const handleRunClick = (run: RunFeedItem) => {
    navigate({
      to: "/workspaces/$workspaceSlug/instant-ad",
      params: { workspaceSlug: workspace.slug },
      search: (prev) => ({ ...prev, runId: run.id }),
    });
  };

  return (
    <>
      <div ref={containerRef} className="flex h-full min-w-0">
        <div className="w-96 flex-shrink-0 pr-6">
          <InputPanel {...inputPanelProps} />
        </div>

        <div className="flex-1 min-w-0 h-full overflow-hidden">
          {selectedRunId ? (
            <RunDetailView
              runId={selectedRunId}
              workspaceSlug={workspace.slug}
            />
          ) : (
            <DataGrid<RunFeedItem>
              items={mergedRuns}
              isLoading={isFeedPending}
              isEmpty={mergedRuns.length === 0}
              renderItem={(run) => (
                <ResultCard
                  key={run.id}
                  run={run}
                  onSelect={() => handleRunClick(run)}
                  onDelete={async () => {
                    await deleteRunsMutation.mutateAsync({ ids: [run.id] });
                  }}
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
              defaultColumns={3}
              minColumns={2}
              maxColumns={6}
              columnStep={1}
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
              className="flex flex-1 min-w-0 flex-col overflow-hidden h-full"
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showBatchDeleteDialog}
        onOpenChange={setShowBatchDeleteDialog}
        title="Delete Selected Items"
        desc={
          <span>
            Are you sure you want to delete{" "}
            <strong>{selectedRunIds.size}</strong> selected item
            {selectedRunIds.size !== 1 ? "s" : ""}? This action cannot be
            undone.
          </span>
        }
        cancelBtnText="Cancel"
        confirmText="Delete"
        destructive={true}
        handleConfirm={handleConfirmBatchDelete}
        isLoading={deleteRunsMutation.isPending}
      />

      <ConfirmDialog
        open={showConfirmGenerateDialog}
        onOpenChange={setShowConfirmGenerateDialog}
        title="Confirm Generation"
        desc="A generation is already running. Starting a new one will reset the current process. Continue?"
        cancelBtnText="Cancel"
        confirmText="Continue"
        handleConfirm={handleConfirmGenerate}
        isLoading={false}
      />
    </>
  );
}
