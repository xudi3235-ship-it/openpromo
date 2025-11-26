import { Button } from "@openpromo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@openpromo/ui/components/dropdown-menu";
import { Skeleton } from "@openpromo/ui/components/skeleton";
import { Spinner } from "@openpromo/ui/components/spinner";
import { Textarea } from "@openpromo/ui/components/textarea";
import { cn } from "@openpromo/ui/lib/utils";
import type { UseMutationResult } from "@tanstack/react-query";
import { Download, MoreVertical, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  type ImageGenListResponse,
  type ImageGenRefineInput,
  type ImageGenRefineResponse,
  useImageGenDeleteBatchMutation,
  useImageGenListQuery,
  useImageGenPromoteMutation,
} from "@/queries/image-gen";

type Generation = NonNullable<ImageGenListResponse["generations"]>[number];

interface ImageGeneratorEditorProps {
  generations: Generation[];
  isLoadingGenerations: boolean;
  remainingSlots: number;
  refineMutation: UseMutationResult<
    ImageGenRefineResponse,
    Error,
    ImageGenRefineInput,
    unknown
  >;
  onBackToGenerator: () => void;
  className?: string;
  initialGenerationId?: string;
}

export function ImageGeneratorEditor({
  generations,
  isLoadingGenerations,
  remainingSlots,
  refineMutation,
  onBackToGenerator,
  className,
  initialGenerationId,
}: ImageGeneratorEditorProps) {
  const [selectedGenerationId, setSelectedGenerationId] = useState<
    string | null
  >(null);
  const [viewingVariantId, setViewingVariantId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [pendingVariants, setPendingVariants] = useState<{ id: string }[]>([]);
  const [variantPendingDeletion, setVariantPendingDeletion] = useState<
    string | null
  >(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);

  const selectedGeneration = useMemo(() => {
    return (
      generations.find(
        (generation) => generation.id === selectedGenerationId,
      ) ?? null
    );
  }, [generations, selectedGenerationId]);

  useEffect(() => {
    if (initialGenerationId && initialGenerationId !== selectedGenerationId) {
      setSelectedGenerationId(initialGenerationId);
      return;
    }

    if (
      !initialGenerationId &&
      !selectedGenerationId &&
      generations.length > 0
    ) {
      setSelectedGenerationId(generations[0].id);
    }
  }, [generations, initialGenerationId, selectedGenerationId]);

  useEffect(() => {
    if (!selectedGenerationId) return;
    const exists = generations.some(
      (generation) => generation.id === selectedGenerationId,
    );
    if (!exists) {
      setSelectedGenerationId(generations[0]?.id ?? null);
    }
  }, [generations, selectedGenerationId]);

  useEffect(() => {
    if (!selectedGeneration) return;
    const metadata = (selectedGeneration.metadata ?? {}) as Record<
      string,
      unknown
    >;
    setPrompt((metadata.prompt as string | undefined) ?? "");
  }, [selectedGeneration]);

  const canGenerate =
    Boolean(selectedGeneration) &&
    remainingSlots > 0 &&
    !refineMutation.isPending;

  const variantsQuery = useImageGenListQuery(
    selectedGeneration
      ? {
          parentGenerationId: selectedGeneration.id,
          includeVariants: true,
          page: 1,
          pageSize: 20,
        }
      : {},
    { enabled: Boolean(selectedGeneration) },
  );

  const variants = variantsQuery.data?.generations ?? [];
  const deleteMutation = useImageGenDeleteBatchMutation();

  const handlePromoteSuccess = useCallback(() => {
    setIsPromoteDialogOpen(false);
    onBackToGenerator();
  }, [onBackToGenerator]);

  const promoteMutation = useImageGenPromoteMutation(handlePromoteSuccess);

  // Determine which generation to display in preview
  const viewingGeneration = useMemo(() => {
    if (viewingVariantId) {
      const variant = variants.find((v) => v.id === viewingVariantId);
      if (variant) return variant;
    }
    return selectedGeneration;
  }, [viewingVariantId, variants, selectedGeneration]);

  const isViewingVariant = viewingGeneration?.id !== selectedGeneration?.id;

  const handleGenerateVariation = () => {
    if (!selectedGeneration) {
      toast.error("Select an image to edit first");
      return;
    }

    if (!selectedGeneration.productId) {
      toast.error("Generation missing product context");
      return;
    }

    if (remainingSlots <= 0) {
      toast.error("No remaining slots available");
      return;
    }

    const referenceImage = selectedGeneration.outputImages?.[0];
    if (!referenceImage) {
      toast.error("Generation missing reference image");
      return;
    }

    const metadata = (selectedGeneration.metadata ?? {}) as Record<
      string,
      unknown
    >;
    const resolvedStyleId =
      (metadata.styleId as string | undefined) ??
      selectedGeneration.styleComponentId ??
      undefined;

    const placeholderId = crypto.randomUUID();
    setPendingVariants((prev) => [...prev, { id: placeholderId }]);

    refineMutation.mutate(
      {
        generationId: selectedGeneration.id,
        styleId: resolvedStyleId,
        prompt: prompt.trim() || undefined,
        referenceImageUrl: referenceImage,
      },
      {
        onSettled: () => {
          setPendingVariants((prev) =>
            prev.filter((pending) => pending.id !== placeholderId),
          );
        },
      },
    );
  };

  const handleConfirmDeleteVariant = () => {
    if (!variantPendingDeletion) return;
    deleteMutation.mutate(
      { ids: [variantPendingDeletion] },
      {
        onSettled: () => setVariantPendingDeletion(null),
      },
    );
  };

  const handleDeleteAll = () => {
    if (variants.length === 0) return;
    deleteMutation.mutate(
      { ids: variants.map((variant) => variant.id) },
      {
        onSettled: () => setIsDeleteAllDialogOpen(false),
      },
    );
  };

  return (
    <div className={cn("flex h-full flex-col gap-4", className)}>
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h2 className="text-base font-semibold">Image Editor</h2>
          <p className="text-xs text-muted-foreground">
            {selectedGeneration
              ? "Refine and create variations"
              : "Select an image to edit"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBackToGenerator}>
          Back to generator
        </Button>
      </div>

      {isLoadingGenerations && (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Loading generations...
        </div>
      )}

      {!isLoadingGenerations && !selectedGeneration && (
        <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground space-y-2 border border-dashed rounded-lg">
          <p>No generation selected.</p>
          <Button variant="outline" size="sm" onClick={onBackToGenerator}>
            Back to generator
          </Button>
        </div>
      )}

      {selectedGeneration && (
        <div className="grid flex-1 min-h-0 grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <div className="border rounded-lg p-4 space-y-4 self-start lg:sticky lg:top-4 lg:h-fit lg:bg-background">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Refinement Instructions</p>
                <span className="text-xs text-muted-foreground">
                  {remainingSlots} {remainingSlots === 1 ? "slot" : "slots"}{" "}
                  left
                </span>
              </div>
              <Textarea
                id="edit-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={8}
                placeholder="e.g., Make the background darker, add more contrast, change lighting to golden hour..."
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Describe what you'd like to change in this image. The AI will
                use the current image as reference.
              </p>
            </div>
            <Button
              onClick={handleGenerateVariation}
              disabled={!canGenerate}
              className="w-full"
            >
              {refineMutation.isPending
                ? "Generating variation..."
                : "Generate variation"}
            </Button>
            {remainingSlots === 0 && (
              <p className="text-xs text-destructive">
                No slots remaining. Delete some variations to free up space.
              </p>
            )}
          </div>

          <div className="border rounded-lg flex flex-col overflow-hidden min-h-0">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {isViewingVariant ? "Variant Preview" : "Original Image"}
                  </p>
                  {viewingGeneration?.state === "completed" && (
                    <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                      Ready
                    </span>
                  )}
                  {viewingGeneration?.state === "pending" && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Spinner className="h-3 w-3" />
                      Generating...
                    </span>
                  )}
                  {viewingGeneration?.state === "failed" && (
                    <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                      Failed
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedGeneration.productId
                    ? `Product: ${selectedGeneration.productId.slice(0, 8)}...`
                    : "Unknown product"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isViewingVariant && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setViewingVariantId(null)}
                    className="h-7 text-xs"
                  >
                    Back to original
                  </Button>
                )}
                {viewingGeneration?.parentGenerationId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          const imageUrl = viewingGeneration.outputImages?.[0];
                          if (imageUrl) {
                            window.open(imageUrl, "_blank");
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download image
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsPromoteDialogOpen(true)}
                        disabled={promoteMutation.isPending}
                      >
                        Promote to gallery
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            <div className="flex-1 bg-muted flex items-center justify-center max-h-[calc(100vh-280px)]">
              {viewingGeneration?.outputImages?.[0] ? (
                <img
                  src={viewingGeneration.outputImages[0]}
                  alt="Selected generation"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  No preview available
                </div>
              )}
            </div>

            <div className="border-t px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    Variations {variants.length > 0 && `(${variants.length})`}
                  </p>
                  {variantsQuery.isFetching && (
                    <Spinner className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                {variants.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsDeleteAllDialogOpen(true)}
                    disabled={deleteMutation.isPending}
                    className="h-7 text-xs"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear all
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <div className="flex gap-3 pb-2 w-full min-h-[5rem] items-center">
                  {variantsQuery.isPending &&
                    Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map(
                      (key) => (
                        <Skeleton key={key} className="w-20 h-20 rounded-md" />
                      ),
                    )}
                  {!variantsQuery.isPending &&
                    pendingVariants.map((item) => (
                      <div
                        key={item.id}
                        className="w-20 h-20 rounded-md border border-dashed flex items-center justify-center text-[11px] text-muted-foreground flex-shrink-0"
                      >
                        <Spinner className="h-4 w-4" />
                      </div>
                    ))}
                  {!variantsQuery.isPending &&
                    variants.map((variant) => {
                      const preview = variant.outputImages?.[0];
                      const isViewing = viewingVariantId === variant.id;
                      return (
                        <div
                          key={variant.id}
                          className={cn(
                            "relative w-20 h-20 rounded-md overflow-hidden border flex-shrink-0 cursor-pointer transition-all",
                            isViewing
                              ? "border-primary ring-2 ring-primary/40 shadow-md"
                              : "border-border hover:border-foreground/40 hover:shadow-sm",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setViewingVariantId(variant.id)}
                            className="absolute inset-0"
                            aria-label="View variant in preview"
                          />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setVariantPendingDeletion(variant.id);
                            }}
                            className="absolute top-1 right-1 z-10 rounded-full bg-background/80 p-1 shadow hover:bg-background"
                            aria-label="Delete variant"
                            disabled={deleteMutation.isPending}
                          >
                            <X className="h-3 w-3" />
                          </button>
                          {preview ? (
                            <img
                              src={preview}
                              alt="Variant preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
                              Pending
                            </div>
                          )}
                          {isViewing && (
                            <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-primary-foreground text-[9px] text-center py-0.5 font-medium">
                              VIEWING
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {!variantsQuery.isPending &&
                    variants.length === 0 &&
                    pendingVariants.length === 0 && (
                      <div className="text-xs text-muted-foreground py-4 px-2">
                        No variations yet. Click "Generate variation" to create
                        refined versions of this image.
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(variantPendingDeletion)}
        onOpenChange={(open) =>
          setVariantPendingDeletion((prev) => (open ? prev : null))
        }
        title="Delete variation"
        desc="This variation will be permanently deleted."
        destructive
        handleConfirm={handleConfirmDeleteVariant}
        isLoading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={isDeleteAllDialogOpen}
        onOpenChange={setIsDeleteAllDialogOpen}
        title="Delete all variations"
        desc="All variations for this image will be permanently deleted."
        destructive
        handleConfirm={handleDeleteAll}
        isLoading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={isPromoteDialogOpen}
        onOpenChange={setIsPromoteDialogOpen}
        title="Promote variation"
        desc="Promote this variation to the main gallery and remove the original plus other variations."
        destructive
        handleConfirm={() => {
          if (!viewingGeneration) return;
          promoteMutation.mutate({ generationId: viewingGeneration.id });
        }}
        isLoading={promoteMutation.isPending}
        confirmText="Promote"
      />
    </div>
  );
}
