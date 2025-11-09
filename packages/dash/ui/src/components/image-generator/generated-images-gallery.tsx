import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Checkbox } from "@openpromo/ui/components/checkbox";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Slider } from "@openpromo/ui/components/slider";
import { Spinner } from "@openpromo/ui/components/spinner";
import { cn } from "@openpromo/ui/lib/utils";
import type { UseMutationResult } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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

  const gridColsClass = useMemo(() => {
    switch (gridCols) {
      case 2:
        return "grid-cols-2";
      case 4:
        return "grid-cols-4";
      case 6:
        return "grid-cols-6";
      default:
        return "grid-cols-2";
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
                {enableComposerActions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddToPost}
                    disabled={remainingSlots === 0}
                  >
                    <Plus className="mr-1.5 h-3 w-3" />
                    Add to post
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteBatchMutation.isPending}
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
              <div className="flex items-center justify-center py-10">
                <Spinner className="h-6 w-6" />
              </div>
            ) : (
              <div className={cn("grid gap-3", gridColsClass)}>
                {/* Loading skeletons when generating */}
                {generateMutation.isPending &&
                  Array.from({ length: loadingSkeletonCount }).map(
                    (_, index) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders do not need stable keys
                        key={`skeleton-${index}`}
                        className="border rounded-lg overflow-hidden bg-muted/50 animate-pulse"
                      >
                        <div className="aspect-square bg-muted" />
                        <div className="p-2.5 space-y-2">
                          <div className="h-3 bg-muted rounded w-3/4" />
                          <div className="h-2 bg-muted rounded w-1/2" />
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
                    />
                  ))
                )}
              </div>
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
}

function GenerationCard({
  generation,
  isSelected,
  onToggleSelection,
  isAddedToPost,
  onEditRequest,
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

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden hover:border-foreground/50 transition-colors group relative",
        isAddedToPost && "ring-2 ring-primary/50 border-primary/50",
      )}
    >
      {/* Checkbox overlay */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(generation.id)}
          className="bg-background border-2"
          onClick={(e) => e.stopPropagation()}
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
        {onEditRequest && generation.state === "completed" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="secondary"
              onClick={(event) => {
                event.stopPropagation();
                onEditRequest(generation);
              }}
            >
              Fine tune
            </Button>
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
