import { Badge } from "@openpromo/ui/components/badge";
import { ScrollArea } from "@openpromo/ui/components/scroll-area";
import { Slider } from "@openpromo/ui/components/slider";
import { Spinner } from "@openpromo/ui/components/spinner";
import { cn } from "@openpromo/ui/lib/utils";
import type { UseMutationResult } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  type ImageGenListResponse,
  useImageGenListQuery,
} from "@/queries/image-gen";
import type {
  ProductImageGenerateInput,
  ProductImageGenerateResponse,
} from "@/queries/product";
import { useImageGenComposerStore } from "@/stores/image-gen-composer-store";

interface ProgressPanelProps {
  generateMutation: UseMutationResult<
    ProductImageGenerateResponse,
    Error,
    ProductImageGenerateInput,
    unknown
  >;
  className?: string;
}

export function ProgressPanel({
  generateMutation,
  className,
}: ProgressPanelProps) {
  const batchCount = useImageGenComposerStore((state) => state.batchCount);
  const [gridCols, setGridCols] = useState(2);
  const { data, isLoading } = useImageGenListQuery({
    page: "1",
    pageSize: "12",
  });

  const generations = data?.generations ?? [];

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

  return (
    <div
      className={cn(
        "border rounded-lg flex flex-col h-full overflow-hidden",
        className,
      )}
    >
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-medium">Progress</h3>
            <p className="text-xs text-muted-foreground">
              Track your generation history
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
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="p-4 pt-2 space-y-4">
            {isLoading ? (
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
                    <span>No generations yet</span>
                  </div>
                ) : (
                  generations.map((generation) => (
                    <GenerationCard
                      key={generation.id}
                      generation={generation}
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

function GenerationCard({ generation }: { generation: Generation }) {
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
    <div className="border rounded-lg overflow-hidden hover:border-foreground/50 transition-colors group relative">
      <div className="aspect-square bg-muted relative overflow-hidden">
        {previewImage ? (
          <img
            src={previewImage}
            alt="Generated"
            className="w-full h-full object-cover"
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
