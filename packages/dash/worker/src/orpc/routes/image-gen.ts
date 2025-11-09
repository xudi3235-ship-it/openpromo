import {
  createVariationFromParent,
  EntImageGeneration,
  generateVariationImage,
} from "@core/domain/image-generation";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import * as z from "zod";
import { generateImages } from "../../routes/api/workspaces/image-gen/generate-handler";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

const listImageGenerationsInput = createWorkspaceInputSchema(
  z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(50).default(20),
    productId: z.string().min(1).optional(),
    includeVariants: z.boolean().default(false),
    parentGenerationId: z.string().min(1).optional(),
  }),
);

const deleteImageGenerationsInput = createWorkspaceInputSchema(
  z.object({
    ids: z.array(z.string().min(1)).min(1),
  }),
);

const generateImageInput = createWorkspaceInputSchema(
  z.object({
    productId: z.string().min(1),
    styleId: z.string().min(1).optional(),
    referenceImageUrl: z.string().optional(),
    batchCount: z.number().int().min(1).max(4).default(1),
    prompt: z.string().optional(),
    parentGenerationId: z.string().min(1).optional(),
  }),
);

const refineImageInput = createWorkspaceInputSchema(
  z.object({
    generationId: z.string().min(1),
    prompt: z.string().optional(),
    styleId: z.string().min(1).optional(),
    referenceImageUrl: z.string().optional(),
  }),
);

export const listImageGenerations = orpcBuilder
  .input(listImageGenerationsInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const {
      page,
      pageSize,
      productId,
      includeVariants,
      parentGenerationId,
      workspaceId: _workspaceId,
      workspaceSlug: _workspaceSlug,
    } = input;

    const result = await EntImageGeneration.list({
      page,
      pageSize,
      productId,
      includeVariants,
      parentGenerationId,
    });

    return {
      generations: result.generations.map((generation) => generation.toJSON()),
      pagination: result.pagination,
    };
  });

export const deleteImageGenerationsBatch = orpcBuilder
  .input(deleteImageGenerationsInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const { ids } = input;
    return EntImageGeneration.deleteBatch(ids);
  });

export const generateImage = orpcBuilder
  .input(generateImageInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const {
      workspaceId: _workspaceId,
      workspaceSlug: _workspaceSlug,
      ...payload
    } = input;
    return generateImages(payload);
  });

export const refineImageGeneration = orpcBuilder
  .input(refineImageInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const {
      generationId,
      prompt,
      styleId,
      referenceImageUrl,
      workspaceId: _workspaceId,
      workspaceSlug: _workspaceSlug,
    } = input;

    const variation = await createVariationFromParent({
      parentGenerationId: generationId,
      prompt,
      styleId,
      referenceImageUrl,
    });

    const fulfilled = await generateVariationImage({
      generation: variation.generation,
      prompt: variation.prompt,
      referenceImageUrl: variation.referenceImageUrl,
    });

    await fulfilled.dispatchUpdateEvent();

    return {
      async: false as const,
      generation: fulfilled.toJSON(),
      imageUrl: fulfilled.data.outputImages[0],
    };
  });

export const imageGenRouter = {
  list: listImageGenerations,
  deleteBatch: deleteImageGenerationsBatch,
  generate: generateImage,
  refine: refineImageGeneration,
};

export type ImageGenRouterOutputs = InferRouterOutputs<typeof imageGenRouter>;
export type ImageGenRouterInputs = InferRouterInputs<typeof imageGenRouter>;
