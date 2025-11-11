import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/lib/orpc-client";
import {
  type ProductImageGenerateInput,
  type ProductImageGenerateResponse,
  useProductImageGenerateMutation,
} from "@/queries/product";
import { useComposerStore } from "@/stores/composer-store";

interface UseImageGeneratorMutationOptions {
  /**
   * Whether to automatically add generated images to the composer after generation.
   * Default: true (for backward compatibility with composer usage)
   * Set to false when using in contexts like Product Visuals page where images
   * should only be added to the gallery, not the composer.
   */
  addToComposer?: boolean;
}

export function useImageGeneratorMutation(
  options: UseImageGeneratorMutationOptions = {},
) {
  const { addToComposer = true } = options;
  const queryClient = useQueryClient();

  return useProductImageGenerateMutation(
    (
      data: ProductImageGenerateResponse,
      _variables: ProductImageGenerateInput,
    ) => {
      queryClient.invalidateQueries({ queryKey: orpc.imageGen.list.key() });

      if (data.async) {
        toast.success("Generating images... Check the gallery for results.");
        return;
      }

      // Only add to composer if enabled
      if (!addToComposer) {
        toast.success(
          `Generated ${data.results.length} image${data.results.length === 1 ? "" : "s"}!`,
        );
        return;
      }

      const imagesToAdd = data.results
        .filter((result) => result.imageUrl && result.generation)
        .map((result) => ({
          id: result.generation.id,
          type: "photo" as const,
          publicUrl: result.imageUrl,
          thumbnailUrl: result.imageUrl,
          mimeType: "image/jpeg",
          s3Key: result.generation.id,
        }));

      if (imagesToAdd.length > 0) {
        useComposerStore.getState().addAttachmentSpecs(imagesToAdd);
        toast.success(
          `Added ${imagesToAdd.length} image${imagesToAdd.length === 1 ? "" : "s"} to your post!`,
        );
      }
    },
  );
}
