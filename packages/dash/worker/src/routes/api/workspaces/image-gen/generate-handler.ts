import { EntImageGeneration } from "@core/domain/image-generation";
import { Actor } from "@core/helpers/actor";
import { Binding } from "@core/helpers/api-env";
import { env } from "@core/utils/env";

export type GenerateImageParams = {
  productId: string;
  styleId?: string;
  referenceImageUrl?: string;
  batchCount?: number;
  prompt?: string;
  parentGenerationId?: string;
};

type AsyncGenerationResult = {
  generationId: string;
  state: string;
  generation: ReturnType<EntImageGeneration["toJSON"]>;
};

type SyncGenerationResult = {
  imageUrl: string;
  generation: ReturnType<EntImageGeneration["toJSON"]>;
};

export type GenerateImageResponse =
  | {
      async: true;
      results: AsyncGenerationResult[];
    }
  | {
      async: false;
      results: SyncGenerationResult[];
    };

export async function generateImages({
  productId,
  styleId,
  referenceImageUrl,
  batchCount = 1,
  prompt,
  parentGenerationId,
}: GenerateImageParams): Promise<GenerateImageResponse> {
  const isLocal = env.VITE_ENVIRONMENT === "local";
  const useAsyncWorkflow = !isLocal;

  let resolvedProductId = productId;
  let resolvedStyleId = styleId;
  let resolvedReferenceImageUrl = referenceImageUrl;
  const resolvedPrompt = prompt;

  if (parentGenerationId) {
    const parentGeneration =
      await EntImageGeneration.fromID(parentGenerationId);

    resolvedProductId = parentGeneration.data.productId ?? resolvedProductId;
    resolvedStyleId =
      resolvedStyleId ?? parentGeneration.data.styleComponentId ?? undefined;
    if (!resolvedReferenceImageUrl) {
      const metadata = (parentGeneration.data.metadata ?? {}) as Record<
        string,
        unknown
      >;
      resolvedReferenceImageUrl =
        (metadata.referenceImageUrl as string | undefined) ??
        parentGeneration.data.outputImages?.[0];
    }

    if (!resolvedReferenceImageUrl) {
      throw new Error("Parent generation is missing a reference image");
    }
  }

  if (!resolvedProductId) {
    throw new Error("Product is required to generate images");
  }

  if (useAsyncWorkflow) {
    const generationPromises = Array.from({ length: batchCount }, async () => {
      const generation = await EntImageGeneration.create({
        state: "pending",
        productId: resolvedProductId,
        styleComponentId: resolvedStyleId ?? null,
        parentGenerationId: parentGenerationId ?? null,
        metadata: {
          prompt: resolvedPrompt,
          referenceImageUrl: resolvedReferenceImageUrl,
          styleId: resolvedStyleId,
          parentGenerationId,
        },
      });

      await generation.dispatchUpdateEvent();

      const actor = Actor.assert("workspace_user");
      await Binding.use().ImageGenerationWorkflow.create({
        params: {
          actor,
          generationId: generation.data.id,
        },
      });

      return generation;
    });

    const generations = await Promise.all(generationPromises);

    return {
      async: true,
      results: generations.map((generation) => ({
        generationId: generation.data.id,
        state: generation.data.state,
        generation: generation.toJSON(),
      })),
    };
  }
  const generations = await Promise.all(
    Array.from({ length: batchCount }, () =>
      EntImageGeneration.generateProductImageWithReference({
        productId: resolvedProductId,
        referenceImageUrl: resolvedReferenceImageUrl,
        prompt: resolvedPrompt ?? "",
        styleId: resolvedStyleId,
        parentGenerationId,
      }),
    ),
  );

  return {
    async: false,
    results: generations.map((generation) => ({
      imageUrl: generation.data.outputImages[0],
      generation: generation.toJSON(),
    })),
  };
}
