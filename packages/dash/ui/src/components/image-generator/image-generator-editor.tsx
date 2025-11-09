import { Button } from "@openpromo/ui/components/button";
import { Textarea } from "@openpromo/ui/components/textarea";
import { cn } from "@openpromo/ui/lib/utils";
import type { UseMutationResult } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ImageGenListResponse } from "@/queries/image-gen";
import type {
  ProductImageGenerateInput,
  ProductImageGenerateResponse,
} from "@/queries/product";

type Generation = NonNullable<ImageGenListResponse["generations"]>[number];

interface ImageGeneratorEditorProps {
  generations: Generation[];
  isLoadingGenerations: boolean;
  remainingSlots: number;
  generateMutation: UseMutationResult<
    ProductImageGenerateResponse,
    Error,
    ProductImageGenerateInput,
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
  generateMutation,
  onBackToGenerator,
  className,
  initialGenerationId,
}: ImageGeneratorEditorProps) {
  const [selectedGenerationId, setSelectedGenerationId] = useState<
    string | null
  >(null);
  const [prompt, setPrompt] = useState("");

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
    !generateMutation.isPending;

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

    generateMutation.mutate({
      productId: selectedGeneration.productId,
      styleId: resolvedStyleId,
      batchCount: 1,
      prompt: prompt.trim() || undefined,
      referenceImageUrl: referenceImage,
    });
  };

  return (
    <div className={cn("flex h-full flex-col gap-4", className)}>
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            Editing image
          </p>
          <h2 className="text-base font-semibold">
            {selectedGeneration ? selectedGeneration.id : "Select an image"}
          </h2>
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
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Prompt tweaks
              </p>
              <Textarea
                id="edit-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={8}
                placeholder="Describe what to change in this image..."
              />
            </div>
            <Button
              onClick={handleGenerateVariation}
              disabled={!canGenerate}
              className="w-full"
            >
              {generateMutation.isPending
                ? "Generating variation..."
                : "Generate variation"}
            </Button>
          </div>

          <div className="border rounded-lg flex flex-col overflow-hidden min-h-0">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Preview
                </p>
                <p className="text-sm font-medium truncate">
                  {selectedGeneration.productId ?? "Unknown product"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedGeneration.state}
              </span>
            </div>
            <div className="flex-1 bg-muted flex items-center justify-center max-h-[calc(100vh-280px)]">
              {selectedGeneration.outputImages?.[0] ? (
                <img
                  src={selectedGeneration.outputImages[0]}
                  alt="Selected generation"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  No preview available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
