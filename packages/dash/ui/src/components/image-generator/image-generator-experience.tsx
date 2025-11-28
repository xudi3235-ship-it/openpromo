import { Dialog, DialogContent } from "@openpromo/ui/components/dialog";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ImageGenListResponse } from "@/queries/image-gen";
import { useImageGenRefineMutation } from "@/queries/image-gen";
import type {
  ProductImageGenerateInput,
  ProductImageGenerateResponse,
} from "@/queries/product";
import { useImageGeneratorStore } from "@/stores/image-generator-store";
import { ImageGeneratorEditor } from "./image-generator-editor";
import {
  ImageGeneratorSurface,
  type ImageGeneratorSurfaceProps,
} from "./image-generator-surface";

type Generation = NonNullable<ImageGenListResponse["generations"]>[number];

export interface ImageGeneratorExperienceProps
  extends ImageGeneratorSurfaceProps {
  generations: Generation[];
  isLoadingGenerations: boolean;
  generateMutation: UseMutationResult<
    ProductImageGenerateResponse,
    Error,
    ProductImageGenerateInput,
    unknown
  >;
}

export function ImageGeneratorExperience({
  className,
  generations,
  isLoadingGenerations,
  ...surfaceProps
}: ImageGeneratorExperienceProps) {
  const mode = useImageGeneratorStore((state) => state.mode);
  const setMode = useImageGeneratorStore((state) => state.setMode);
  const editingGenerationId = useImageGeneratorStore(
    (state) => state.editingGenerationId,
  );
  const setEditingGenerationId = useImageGeneratorStore(
    (state) => state.setEditingGenerationId,
  );

  const handleEnterEditMode = (generation: Generation) => {
    setEditingGenerationId(generation.id);
    setMode("edit");
  };

  const handleBackToGenerator = () => {
    setEditingGenerationId(null);
    setMode("generate");
  };

  const refineMutation = useImageGenRefineMutation();
  const isEditorOpen = mode === "edit";

  return (
    <>
      <ImageGeneratorSurface
        {...surfaceProps}
        className={className}
        onGenerationEditRequest={handleEnterEditMode}
      />
      <Dialog
        open={isEditorOpen}
        onOpenChange={(open) => !open && handleBackToGenerator()}
      >
        <DialogContent className="!max-w-none w-full h-[90vh] p-0 flex flex-col overflow-hidden sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] 2xl:w-[1200px]">
          <ImageGeneratorEditor
            generations={generations}
            isLoadingGenerations={isLoadingGenerations}
            remainingSlots={surfaceProps.remainingSlots}
            refineMutation={refineMutation}
            onBackToGenerator={handleBackToGenerator}
            className="h-full"
            initialGenerationId={editingGenerationId ?? undefined}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
