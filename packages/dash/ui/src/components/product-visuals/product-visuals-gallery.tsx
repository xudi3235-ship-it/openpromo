/** biome-ignore-all lint/style/noNonNullAssertion: ok */
import { Badge } from "@openpromo/ui/components/badge";
import { Button } from "@openpromo/ui/components/button";
import { Checkbox } from "@openpromo/ui/components/checkbox";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Slider } from "@openpromo/ui/components/slider";
import { Spinner } from "@openpromo/ui/components/spinner";
import { cn } from "@openpromo/ui/lib/utils";
import { FileText, Film, Image as ImageIcon, Play, Trash2 } from "lucide-react";
import { type ReactElement, useMemo, useState } from "react";
import { toast } from "sonner";
import { ImageGrid } from "@/components/common/ImageGrid";
import { useOpenComposer } from "@/hooks/useOpenComposer";
import type { ProductVisualsFeedResponse } from "@/queries/product-visuals";
import { useProductVisualsBatchDeleteMutation } from "@/queries/product-visuals";
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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [gridCols, setGridCols] = useState(4);
  const [previewItem, setPreviewItem] = useState<FeedItem | null>(null);
  const openComposer = useOpenComposer();

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
    setSelectedItems(new Set());
    onRefetch?.();
  });

  const isDeleting = deleteMutation.isPending;

  const handleToggleSelection = (id: string) => {
    setSelectedItems((prev) => {
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
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((item) => `${item.type}-${item.id}`)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;

    // Split selected items by type
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
    setSelectedItems(new Set());
  };

  return (
    <div className="border rounded-lg flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b bg-card/80 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Generated images and videos</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {gridCols} cols
            </span>
            <Slider
              value={[gridCols]}
              onValueChange={(value) => setGridCols(value[0] || 4)}
              min={2}
              max={6}
              step={2}
              className="w-20"
            />
          </div>
        </div>

        {/* Selection Toolbar */}
        {items.length > 0 && (
          <div className="flex items-center justify-between p-2 border rounded-md bg-background">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedItems.size === items.length && items.length > 0
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
            {isLoading ? (
              <ImageGrid tight cols={gridColsConfig}>
                {Array.from({ length: 8 }).map((_, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: placeholder skeletons
                  <div key={`gallery-skeleton-${index}`} className="space-y-2">
                    <Skeleton className="aspect-square w-full rounded-md" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-2 w-3/4" />
                  </div>
                ))}
              </ImageGrid>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">No visuals yet</p>
                <p className="text-xs text-muted-foreground">
                  Generate images or videos to see them in one place.
                </p>
              </div>
            ) : (
              <ImageGrid tight cols={gridColsConfig}>
                {items.map((item) => (
                  <ProductVisualsCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    isSelected={selectedItems.has(`${item.type}-${item.id}`)}
                    onToggleSelection={() =>
                      handleToggleSelection(`${item.type}-${item.id}`)
                    }
                    onDelete={() => handleDeleteSingle(item)}
                    onPreview={() => setPreviewItem(item)}
                    isDeleting={isDeleting}
                    enableComposerActions={enableComposerActions}
                  />
                ))}
              </ImageGrid>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Preview Modal */}
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
  isDeleting: boolean;
  enableComposerActions?: boolean;
}

function ProductVisualsCard({
  item,
  isSelected,
  onToggleSelection,
  onDelete,
  onPreview,
  isDeleting,
  enableComposerActions = true,
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
      {/* Checkbox overlay */}
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

      {/* Type badge overlay */}
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

      {/* Actions dropdown - appears on hover */}
      {isCompleted && (
        <ProductVisualsActionsDropdown
          item={item}
          onDelete={onDelete}
          isDeleting={isDeleting}
          enableComposerActions={enableComposerActions}
        />
      )}

      {/* Play button overlay for videos */}
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
