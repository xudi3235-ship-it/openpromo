import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Checkbox } from "@openpromo/ui/components/checkbox";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Slider } from "@openpromo/ui/components/slider";
import { Spinner } from "@openpromo/ui/components/spinner";
import { cn } from "@openpromo/ui/lib/utils";
import type { UseMutationResult } from "@tanstack/react-query";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ImageGrid } from "@/components/common/ImageGrid";
import { useOpenComposer } from "@/hooks/useOpenComposer";
import { useWorkspaceEvents } from "@/hooks/useWorkspaceWebSocket";
import {
  type ImageGenListResponse,
  useImageGenDeleteBatchMutation,
  useImageGenListQuery,
} from "@/queries/image-gen";
import type {
  ProductImageGenerateInput,
  ProductImageGenerateResponse,
} from "@/queries/product";
import { useComposerStore } from "@/stores/composer-store";
import { useImageGeneratorStore } from "@/stores/image-generator-store";
import { GenerationCardActions } from "./generation-card-actions";

interface GeneratedImagesGalleryProps {
  generateMutation: UseMutationResult<
    ProductImageGenerateResponse,
    Error,
    ProductImageGenerateInput,
    unknown
  >;
  remainingSlots: number;
  enableComposerActions?: boolean;
  className?: string;
  onEditGeneration?: (generation: Generation) => void;
}

export function GeneratedImagesGallery({
  generateMutation,
  remainingSlots,
  enableComposerActions = true,
  className,
  onEditGeneration,
}: GeneratedImagesGalleryProps) {
  const batchCount = useImageGeneratorStore((state) => state.batchCount);
  const [gridCols, setGridCols] = useState(4);
  const [selectedGenerations, setSelectedGenerations] = useState<Set<string>>(
    new Set(),
  );
  const { data, isPending, refetch } = useImageGenListQuery({
    page: 1,
    pageSize: 12,
  });

  const openComposer = useOpenComposer();

  const generations = data?.generations ?? [];

  // Listen for image generation updates via WebSocket
  useWorkspaceEvents({
    handlers: {
      "image_generation.updated": (_event) => {
        // TODO: debug this
        refetch();
      },
    },
  });

  // Get current attachments from composer to check what's already added
  const attachments = useComposerStore(
    (state) => state.contentCreateData.base.attachments ?? [],
  );
  const addedGenerationIds = useMemo(
    () => new Set(attachments.map((att) => att.s3Key || att.id)),
    [attachments],
  );

  const deleteBatchMutation = useImageGenDeleteBatchMutation(() => {
    setSelectedGenerations(new Set());
  });

  const loadingSkeletonCount = useMemo(() => {
    if (!generateMutation.isPending) return 0;
    return Math.max(1, Math.min(batchCount, 4));
  }, [batchCount, generateMutation.isPending]);

  const gridColsConfig = useMemo(() => {
    switch (gridCols) {
      case 2:
        return { sm: 2, md: 2, lg: 2, xl: 2 };
      case 4:
        return { sm: 2, md: 3, lg: 4, xl: 4 };
      case 6:
        return { sm: 3, md: 4, lg: 5, xl: 6 };
      default:
        return { sm: 2, md: 2, lg: 2, xl: 2 };
    }
  }, [gridCols]);

  const handleToggleSelection = (id: string) => {
    setSelectedGenerations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedGenerations.size === generations.length) {
      setSelectedGenerations(new Set());
    } else {
      setSelectedGenerations(new Set(generations.map((g) => g.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedGenerations.size === 0) return;
    deleteBatchMutation.mutate({ ids: Array.from(selectedGenerations) });
  };

  const handleDeleteSingle = (generation: Generation) => {
    deleteBatchMutation.mutate({ ids: [generation.id] });
  };

  const handleCardClick = (generation: Generation) => {
    // Only handle clicks for completed generations
    if (generation.state !== "completed") return;
    if (!generation.outputImages?.[0]) return;

    // Only enable click-to-add inside composer
    if (enableComposerActions) {
      // Inside composer: add directly to post
      if (remainingSlots === 0) {
        toast.error("No more slots available");
        return;
      }

      const imageToAdd = {
        id: generation.id,
        type: "photo" as const,
        publicUrl: generation.outputImages[0],
        thumbnailUrl: generation.outputImages[0],
        mimeType: "image/jpeg",
        s3Key: generation.id,
      };

      useComposerStore.getState().addAttachmentSpecs([imageToAdd]);
      toast.success("Added to post");
    }
    // Outside composer: do nothing on click (use dropdown or multi-select instead)
  };

  const handleAddToPost = () => {
    if (!enableComposerActions) return;
    if (selectedGenerations.size === 0) return;

    // Check if adding would exceed remaining slots
    if (selectedGenerations.size > remainingSlots) {
      toast.error(
        `Can only add ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"}`,
      );
      return;
    }

    // Get selected generations and extract image URLs
    const selectedItems = generations.filter((gen) =>
      selectedGenerations.has(gen.id),
    );

    const imagesToAdd = selectedItems
      .filter((gen) => gen.outputImages?.[0] && gen.state === "completed")
      .map((gen) => ({
        id: gen.id,
        type: "photo" as const,
        publicUrl: gen.outputImages[0],
        thumbnailUrl: gen.outputImages[0],
        mimeType: "image/jpeg",
        s3Key: gen.id,
      }));

    if (imagesToAdd.length === 0) {
      toast.error("No completed images to add");
      return;
    }

    // Add to composer store
    useComposerStore.getState().addAttachmentSpecs(imagesToAdd);

    toast.success(
      `Added ${imagesToAdd.length} image${imagesToAdd.length === 1 ? "" : "s"} to post`,
    );

    // Clear selection after adding
    setSelectedGenerations(new Set());
  };

  const handleCreatePostWithSelected = () => {
    if (enableComposerActions) return; // Only for product visuals page
    if (selectedGenerations.size === 0) return;

    // Get selected generations and extract image URLs
    const selectedItems = generations.filter((gen) =>
      selectedGenerations.has(gen.id),
    );

    const imagesToAdd = selectedItems
      .filter((gen) => gen.outputImages?.[0] && gen.state === "completed")
      .map((gen) => ({
        id: gen.id,
        type: "photo" as const,
        publicUrl: gen.outputImages[0],
        thumbnailUrl: gen.outputImages[0],
        mimeType: "image/jpeg",
        s3Key: gen.id,
      }));

    if (imagesToAdd.length === 0) {
      toast.error("No completed images to add");
      return;
    }

    // Open composer with selected images
    openComposer({
      attachments: imagesToAdd,
    });

    // Clear selection after creating post
    setSelectedGenerations(new Set());
  };

  return (
    <div
      className={cn(
        "border rounded-lg flex flex-col h-full overflow-hidden",
        className,
      )}
    >
      <div className="px-4 pt-4 pb-2 flex-shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-medium">Generated Images</h3>
            <p className="text-xs text-muted-foreground">
              Your product image generations
            </p>
          </div>
          <div className="flex items-center gap-3 pt-0.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {gridCols} cols
            </span>
            <Slider
              value={[gridCols]}
              onValueChange={(value) => setGridCols(value[0] || 2)}
              min={2}
              max={6}
              step={2}
              className="w-20"
            />
          </div>
        </div>

        {/* Selection Toolbar */}
        {generations.length > 0 && (
          <div className="flex items-center justify-between p-2 border rounded-md bg-background">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedGenerations.size === generations.length &&
                  generations.length > 0
                }
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
              />
              <span className="text-xs text-muted-foreground">
                {selectedGenerations.size > 0
                  ? `${selectedGenerations.size} selected`
                  : "Select all"}
              </span>
            </div>
            {selectedGenerations.size > 0 && (
              <div className="flex items-center gap-2">
                {enableComposerActions ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddToPost}
                    disabled={remainingSlots === 0}
                  >
                    <Plus className="mr-1.5 h-3 w-3" />
                    Add to post
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreatePostWithSelected}
                  >
                    <FileText className="mr-1.5 h-3 w-3" />
                    Create post
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteBatchMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  {deleteBatchMutation.isPending ? (
                    <>
                      <Spinner className="mr-1.5 h-3 w-3" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-1.5 h-3 w-3" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4 pt-2 space-y-4">
            {isPending ? (
              <ImageGrid tight cols={gridColsConfig}>
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders do not need stable keys
                    key={`loading-skeleton-${index}`}
                    className="border border-gray-200 dark:border-gray-800 overflow-hidden"
                  >
                    <Skeleton className="aspect-square w-full" />
                    <div className="p-2.5 space-y-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  </div>
                ))}
              </ImageGrid>
            ) : (
              <ImageGrid tight cols={gridColsConfig}>
                {/* Loading skeletons when generating */}
                {generateMutation.isPending &&
                  Array.from({ length: loadingSkeletonCount }).map(
                    (_, index) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders do not need stable keys
                        key={`skeleton-${index}`}
                        className="border border-gray-200 dark:border-gray-800 overflow-hidden"
                      >
                        <Skeleton className="aspect-square w-full" />
                        <div className="p-2.5 space-y-2">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-2 w-1/2" />
                        </div>
                      </div>
                    ),
                  )}

                {generations.length === 0 && !generateMutation.isPending ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground gap-2">
                    <span className="text-2xl">✨</span>
                    <span>No product images generated yet</span>
                  </div>
                ) : (
                  generations.map((generation) => (
                    <GenerationCard
                      key={generation.id}
                      generation={generation}
                      isSelected={selectedGenerations.has(generation.id)}
                      onToggleSelection={handleToggleSelection}
                      isAddedToPost={addedGenerationIds.has(generation.id)}
                      onEditRequest={onEditGeneration}
                      onDeleteRequest={handleDeleteSingle}
                      onCardClick={handleCardClick}
                      showCreatePostAction={!enableComposerActions}
                    />
                  ))
                )}
              </ImageGrid>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

type Generation = NonNullable<ImageGenListResponse["generations"]>[number];

interface GenerationCardProps {
  generation: Generation;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  isAddedToPost: boolean;
  onEditRequest?: (generation: Generation) => void;
  onDeleteRequest?: (generation: Generation) => void;
  onCardClick?: (generation: Generation) => void;
  showCreatePostAction?: boolean;
}

function GenerationCard({
  generation,
  isSelected,
  onToggleSelection,
  isAddedToPost,
  onEditRequest,
  onDeleteRequest,
  onCardClick,
  showCreatePostAction,
}: GenerationCardProps) {
  const previewImage = generation.outputImages?.[0];

  const createdLabel = generation.createdAt
    ? new Date(generation.createdAt).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      })
    : null;

  const isPending = ["not_started", "pending", "generating"].includes(
    generation.state,
  );

  // Only clickable inside composer (when showCreatePostAction is false)
  const isClickable =
    onCardClick && !isPending && !isAddedToPost && !showCreatePostAction;

  const handleCardClick = () => {
    if (isClickable) {
      onCardClick(generation);
    }
  };

  return (
    <div
      className={cn(
        "border overflow-hidden hover:border-foreground/50 transition-colors group relative border-gray-200 dark:border-gray-800",
        isAddedToPost && "ring-2 ring-primary/50 border-primary/50",
        isClickable && "cursor-pointer hover:shadow-md",
      )}
      onClick={handleCardClick}
    >
      {/* Checkbox overlay */}
      <div
        className="absolute top-2 left-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(generation.id)}
          className="bg-background border-2"
        />
      </div>

      {/* "In Post" badge overlay */}
      {isAddedToPost && (
        <div className="absolute top-2 right-2 z-10">
          <div className="px-1.5 py-0.5 text-[10px] rounded bg-background/90 backdrop-blur-sm border text-muted-foreground font-medium">
            In Post
          </div>
        </div>
      )}

      {/* Actions dropdown - bottom right */}
      {!isAddedToPost && (
        <div className="absolute bottom-14 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <GenerationCardActions
            generation={generation}
            onEdit={onEditRequest}
            onDelete={onDeleteRequest}
            showCreatePost={showCreatePostAction}
          />
        </div>
      )}

      <div className="aspect-square bg-muted relative overflow-hidden">
        {previewImage ? (
          <img
            src={previewImage}
            alt="Generated"
            className={cn(
              "w-full h-full object-cover transition-opacity",
              isAddedToPost && "opacity-75",
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-muted-foreground">
              {isPending ? <Spinner className="h-4 w-4" /> : "No image"}
            </span>
          </div>
        )}
      </div>
      <div className="p-2.5 bg-background">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <span className="px-1.5 py-0.5 rounded border bg-muted text-[10px]">
            {generation.styleComponentId ? "Styled" : "Studio"}
          </span>
          {isPending && (
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[10px] h-auto"
            >
              {formatState(generation.state)}
            </Badge>
          )}
          {createdLabel && <span className="text-[10px]">{createdLabel}</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          ID: {generation.id.slice(0, 8)}
        </p>
      </div>
    </div>
  );
}

function formatState(state: Generation["state"]) {
  switch (state) {
    case "not_started":
      return "Queued";
    case "pending":
      return "Pending";
    case "generating":
      return "Generating";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return state;
  }
}
