/** biome-ignore-all lint/style/noNonNullAssertion: ok */
import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Checkbox } from "@openpromo/ui/components/checkbox";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Slider } from "@openpromo/ui/components/slider";
import { Spinner } from "@openpromo/ui/components/spinner";
import { cn } from "@openpromo/ui/lib/utils";
import {
  ArrowLeft,
  FileText,
  Film,
  Image as ImageIcon,
  Play,
  Trash2,
} from "lucide-react";
import { type ReactElement, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { ImageGrid } from "@/components/common/ImageGrid";
import { useOpenComposer } from "@/hooks/useOpenComposer";
import { useImageGenListQuery } from "@/queries/image-gen";
import type { ProductVisualsFeedResponse } from "@/queries/product-visuals";
import { useProductVisualsBatchDeleteMutation } from "@/queries/product-visuals";
import { useProductVisualGeneratorStore } from "@/stores/product-visual-generator-store";
import { ProductVisualsActionsDropdown } from "./product-visuals-actions-dropdown";
import { ProductVisualsPreviewModal } from "./product-visuals-preview-modal";

type FeedItem = ProductVisualsFeedResponse["items"][number];

interface ProductVisualsGalleryProps {
  items: FeedItem[];
  isLoading: boolean;
  onRefetch?: () => void;
  enableComposerActions?: boolean;
}

const stateLabelMap: Record<FeedItem["state"], string> = {
  not_started: "Queued",
  pending: "Pending",
  generating: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export function ProductVisualsGallery({
  items,
  isLoading,
  onRefetch,
  enableComposerActions = true,
}: ProductVisualsGalleryProps) {
  const selectedItems = useProductVisualGeneratorStore(
    (state) => state.selectedGalleryItems,
  );
  const setSelectedItems = useProductVisualGeneratorStore(
    (state) => state.setSelectedGalleryItems,
  );
  const clearSelectedGalleryItems = useProductVisualGeneratorStore(
    (state) => state.clearSelectedGalleryItems,
  );

  const gridCols = useProductVisualGeneratorStore(
    (state) => state.galleryGridCols,
  );
  const setGalleryGridCols = useProductVisualGeneratorStore(
    (state) => state.setGalleryGridCols,
  );

  const previewItem = useProductVisualGeneratorStore(
    (state) => state.previewItem,
  );
  const setPreviewItem = useProductVisualGeneratorStore(
    (state) => state.setPreviewItem,
  );

  const setVariationPrompt = useProductVisualGeneratorStore(
    (state) => state.setVariationPrompt,
  );

  const setSelectedItemForVariation = useProductVisualGeneratorStore(
    (state) => state.setSelectedItemForVariation,
  );

  const selectedParentForVariations = useProductVisualGeneratorStore(
    (state) => state.selectedParentForVariations,
  );
  const setSelectedParentForVariations = useProductVisualGeneratorStore(
    (state) => state.setSelectedParentForVariations,
  );
  const setSelectedProductId = useProductVisualGeneratorStore(
    (state) => state.setSelectedProductId,
  );
  const setSelectedStyleId = useProductVisualGeneratorStore(
    (state) => state.setSelectedStyleId,
  );
  const setVariationRefetch = useProductVisualGeneratorStore(
    (state) => state.setVariationRefetch,
  );

  const openComposer = useOpenComposer();

  const {
    data: variationsData,
    isPending: isVariationsLoading,
    refetch: refetchVariations,
  } = useImageGenListQuery(
    {
      parentGenerationId: selectedParentForVariations || undefined,
      pageSize: 50,
    },
    {
      enabled: !!selectedParentForVariations,
    },
  );

  useEffect(() => {
    setVariationRefetch(() => refetchVariations);
    return () => setVariationRefetch(null);
  }, [refetchVariations, setVariationRefetch]);

  const gridColsConfig = useMemo(() => {
    switch (gridCols) {
      case 2:
        return { sm: 2, md: 2, lg: 2, xl: 2 };
      case 4:
        return { sm: 2, md: 3, lg: 4, xl: 4 };
      case 6:
        return { sm: 3, md: 4, lg: 5, xl: 6 };
      default:
        return { sm: 2, md: 3, lg: 4, xl: 4 };
    }
  }, [gridCols]);

  const deleteMutation = useProductVisualsBatchDeleteMutation(() => {
    clearSelectedGalleryItems();
    onRefetch?.();
  });

  const isDeleting = deleteMutation.isPending;

  const displayItems = useMemo(() => {
    if (selectedParentForVariations) {
      if (variationsData) {
        return variationsData.generations.map(
          (gen): FeedItem => ({
            id: gen.id,
            type: "image" as const,
            createdAt: gen.createdAt?.toISOString() ?? null,
            productId: gen.productId ?? null,
            styleComponentId: gen.styleComponentId ?? null,
            previewUrl: gen.outputImages?.[0] ?? null,
            outputUrl: gen.outputImages?.[0] ?? null,
            state: gen.state,
            stateMessage: gen.stateMessage ?? null,
            prompt:
              ((gen.metadata as Record<string, unknown>)
                ?.variationPrompt as string) ||
              ((gen.metadata as Record<string, unknown>)?.prompt as string) ||
              null,
          }),
        );
      }
      return [];
    }
    return items;
  }, [selectedParentForVariations, variationsData, items]);

  const isDisplayLoading = selectedParentForVariations
    ? isVariationsLoading
    : isLoading;

  const handleToggleSelection = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedItems(next);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === displayItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(
        new Set(displayItems.map((item) => `${item.type}-${item.id}`)),
      );
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;

    const imageIds: string[] = [];
    const videoIds: string[] = [];

    for (const key of selectedItems) {
      const item = items.find((i) => `${i.type}-${i.id}` === key);
      if (item) {
        if (item.type === "image") {
          imageIds.push(item.id);
        } else {
          videoIds.push(item.id);
        }
      }
    }

    try {
      await deleteMutation.mutateAsync({ imageIds, videoIds });
    } catch {
      // Errors are handled by the mutation's onError
    }
  };

  const handleDeleteSingle = async (item: FeedItem) => {
    if (item.type === "image") {
      deleteMutation.mutate({ imageIds: [item.id], videoIds: [] });
    } else {
      deleteMutation.mutate({ imageIds: [], videoIds: [item.id] });
    }
  };

  const handleCreatePostWithSelected = () => {
    if (selectedItems.size === 0) return;

    const selectedList = items.filter(
      (item) =>
        selectedItems.has(`${item.type}-${item.id}`) &&
        item.state === "completed" &&
        item.outputUrl,
    );

    if (selectedList.length === 0) {
      toast.error("No completed items to add");
      return;
    }

    const attachments = selectedList.map((item) => ({
      id: item.id,
      type: item.type === "video" ? ("video" as const) : ("photo" as const),
      publicUrl: item.outputUrl!,
      thumbnailUrl: item.previewUrl ?? item.outputUrl!,
      mimeType: item.type === "video" ? "video/mp4" : "image/jpeg",
      s3Key: item.id,
    }));

    openComposer({ attachments });
    clearSelectedGalleryItems();
  };

  const handleCreateVariationWithSelected = () => {
    if (selectedItems.size === 0) return;

    const selectedImages = items.filter(
      (item) =>
        selectedItems.has(`${item.type}-${item.id}`) &&
        item.type === "image" &&
        item.state === "completed" &&
        item.outputUrl,
    );

    if (selectedImages.length === 0) {
      toast.error("No completed images to create variations from");
      return;
    }

    if (selectedImages.length > 1) {
      toast.error("Please select only one image to create a variation");
      return;
    }

    const selectedImage = selectedImages[0];
    setSelectedItemForVariation(selectedImage);
    setVariationPrompt("");

    if (selectedImage.productId) {
      setSelectedProductId(selectedImage.productId);
    }
    if (selectedImage.styleComponentId) {
      setSelectedStyleId(selectedImage.styleComponentId);
    }
  };

  const handleBackToMain = () => {
    setSelectedParentForVariations(null);
    clearSelectedGalleryItems();
  };

  const handleViewVariations = (item: FeedItem) => {
    if (item.type === "image") {
      setSelectedParentForVariations(item.id);
      clearSelectedGalleryItems();
    }
  };

  return (
    <div className="border rounded-lg flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b bg-card/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedParentForVariations && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToMain}
                className="h-6 w-6 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h3 className="text-sm font-medium">
              {selectedParentForVariations
                ? "Image Variations"
                : "Generated images and videos"}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {gridCols} cols
            </span>
            <Slider
              value={[gridCols]}
              onValueChange={(value) => setGalleryGridCols(value[0] || 4)}
              min={2}
              max={6}
              step={2}
              className="w-20"
            />
          </div>
        </div>

        {displayItems.length > 0 && !selectedParentForVariations && (
          <div className="flex items-center justify-between p-2 border rounded-md bg-background">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedItems.size === displayItems.length &&
                  displayItems.length > 0
                }
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
              />
              <span className="text-xs text-muted-foreground">
                {selectedItems.size > 0
                  ? `${selectedItems.size} selected`
                  : "Select all"}
              </span>
            </div>
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-2">
                {enableComposerActions && (
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
                  onClick={handleCreateVariationWithSelected}
                >
                  <ImageIcon className="mr-1.5 h-3 w-3" />
                  Create variation
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive"
                >
                  {isDeleting ? (
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
          <div className="p-4">
            {isDisplayLoading ? (
              <ImageGrid tight cols={gridColsConfig}>
                {[
                  "one",
                  "two",
                  "three",
                  "four",
                  "five",
                  "six",
                  "seven",
                  "eight",
                ].map((id) => (
                  <div key={`gallery-skeleton-${id}`} className="space-y-2">
                    <Skeleton className="aspect-square w-full rounded-md" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-2 w-3/4" />
                  </div>
                ))}
              </ImageGrid>
            ) : displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">
                  {selectedParentForVariations
                    ? "No variations yet"
                    : "No visuals yet"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedParentForVariations
                    ? "Create variations to see them here."
                    : "Generate images or videos to see them in one place."}
                </p>
              </div>
            ) : (
              <ImageGrid tight cols={gridColsConfig}>
                {displayItems.map((item) => (
                  <ProductVisualsCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    isSelected={selectedItems.has(`${item.type}-${item.id}`)}
                    onToggleSelection={() =>
                      handleToggleSelection(`${item.type}-${item.id}`)
                    }
                    onDelete={() => handleDeleteSingle(item)}
                    onPreview={() => setPreviewItem(item)}
                    onViewVariations={
                      selectedParentForVariations
                        ? undefined
                        : handleViewVariations
                    }
                    isDeleting={isDeleting}
                    enableComposerActions={enableComposerActions}
                    isVariationView={!!selectedParentForVariations}
                  />
                ))}
              </ImageGrid>
            )}
          </div>
        </ScrollArea>
      </div>

      <ProductVisualsPreviewModal
        previewItem={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}

interface ProductVisualsCardProps {
  item: FeedItem;
  isSelected: boolean;
  onToggleSelection: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onViewVariations?: (item: FeedItem) => void;
  isDeleting: boolean;
  enableComposerActions?: boolean;
  isVariationView?: boolean;
}

function ProductVisualsCard({
  item,
  isSelected,
  onToggleSelection,
  onDelete,
  onPreview,
  onViewVariations,
  isDeleting,
  enableComposerActions = true,
  isVariationView = false,
}: ProductVisualsCardProps): ReactElement {
  const isVideo = item.type === "video";
  const preview = item.previewUrl ?? null;
  const createdLabel = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "";
  const canOpen = Boolean(item.outputUrl);
  const isCompleted = item.state === "completed";

  const isPending = ["not_started", "pending", "generating"].includes(
    item.state,
  );

  return (
    <div
      className={cn(
        "border overflow-hidden hover:border-foreground/50 transition-colors group relative border-gray-200 dark:border-gray-800",
        canOpen && "cursor-pointer hover:shadow-md",
        isSelected && "ring-2 ring-primary/50 border-primary/50",
      )}
      onClick={canOpen ? onPreview : undefined}
    >
      <div
        className="absolute top-2 left-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelection}
          className="bg-background border-2"
        />
      </div>

      <div className="absolute top-2 left-9 z-10">
        <div className="flex items-center gap-1 rounded-full bg-background/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium border shadow-sm">
          {isVideo ? (
            <Film className="h-3 w-3" />
          ) : (
            <ImageIcon className="h-3 w-3" />
          )}
          <span>{isVideo ? "Video" : "Image"}</span>
        </div>
      </div>

      {isCompleted && (
        <ProductVisualsActionsDropdown
          item={item}
          onDelete={onDelete}
          onViewVariations={onViewVariations}
          isDeleting={isDeleting}
          enableComposerActions={enableComposerActions}
          isVariationView={isVariationView}
        />
      )}

      {isVideo && canOpen && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white">
            <Play className="h-4 w-4" />
          </span>
        </div>
      )}

      <div className="aspect-square bg-muted relative overflow-hidden">
        {preview ? (
          <img
            src={preview}
            alt="Generated"
            className={cn(
              "w-full h-full object-cover",
              isSelected && "opacity-75",
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-muted-foreground">
              {isPending ? (
                <Spinner className="h-4 w-4" />
              ) : isVideo ? (
                <Film className="h-8 w-8" />
              ) : (
                <ImageIcon className="h-8 w-8" />
              )}
            </span>
          </div>
        )}
      </div>
      <div className="p-2.5 bg-background">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          {isPending && (
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[10px] h-auto"
            >
              {stateLabelMap[item.state]}
            </Badge>
          )}
          {item.state === "failed" && (
            <Badge
              variant="destructive"
              className="px-1.5 py-0 text-[10px] h-auto"
            >
              Failed
            </Badge>
          )}
          {createdLabel && <span className="text-[10px]">{createdLabel}</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {item.type === "image" && item.prompt
            ? item.prompt
            : item.productId
              ? `Product: ${item.productId.slice(0, 8)}`
              : "No product"}
        </p>
      </div>
    </div>
  );
}
