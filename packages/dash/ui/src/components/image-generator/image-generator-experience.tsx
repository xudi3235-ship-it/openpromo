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

  if (mode === "edit") {
    return (
      <ImageGeneratorEditor
        generations={generations}
        isLoadingGenerations={isLoadingGenerations}
        remainingSlots={surfaceProps.remainingSlots}
        refineMutation={refineMutation}
        onBackToGenerator={handleBackToGenerator}
        className={className}
        initialGenerationId={editingGenerationId ?? undefined}
      />
    );
  }

  return (
    <ImageGeneratorSurface
      {...surfaceProps}
      className={className}
      onGenerationEditRequest={handleEnterEditMode}
    />
  );
}
