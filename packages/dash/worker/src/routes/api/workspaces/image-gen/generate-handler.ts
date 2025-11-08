import { EntImageGeneration } from "@core/domain/image-generation";
import { Actor } from "@core/helpers/actor";
import { Binding } from "@core/helpers/api-env";
import { env } from "@core/utils/env";

export type GenerateImageParams = {
  productId: string;
  styleId?: string;
  referenceImageUrl?: string;
  mode?: "studio" | "style";
  batchCount?: number;
  prompt?: string;
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
  mode = "studio",
  batchCount = 1,
  prompt,
}: GenerateImageParams): Promise<GenerateImageResponse> {
  const isLocal = env.VITE_ENVIRONMENT === "local";
  const useAsyncWorkflow = !isLocal;

  if (useAsyncWorkflow) {
    const generationPromises = Array.from({ length: batchCount }, async () => {
      const generation = await EntImageGeneration.create({
        state: "pending",
        productId,
        styleComponentId: styleId ?? null,
        metadata: {
          mode,
          prompt,
          referenceImageUrl,
        },
      });

      await generation.dispatchUpdateEvent();

      const actor = Actor.use();
      if (actor.type !== "workspace_user") {
        throw new Error("Actor must be workspace_user to trigger workflow");
      }

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

  if (mode === "studio") {
    const generations = await Promise.all(
      Array.from({ length: batchCount }, () =>
        EntImageGeneration.generateStudioBackgroundImage(productId, prompt),
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

  const generations = await Promise.all(
    Array.from({ length: batchCount }, () =>
      EntImageGeneration.generateProductImageWithReference({
        productId,
        referenceImageUrl: referenceImageUrl as string,
        prompt: prompt ?? "",
        styleId,
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
