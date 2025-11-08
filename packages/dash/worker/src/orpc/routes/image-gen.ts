import { EntImageGeneration } from "@core/domain/image-generation";
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
      workspaceId: _workspaceId,
      workspaceSlug: _workspaceSlug,
    } = input;

    const result = await EntImageGeneration.list({
      page,
      pageSize,
      productId,
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

export const imageGenRouter = {
  list: listImageGenerations,
  deleteBatch: deleteImageGenerationsBatch,
  generate: generateImage,
};

export type ImageGenRouterOutputs = InferRouterOutputs<typeof imageGenRouter>;
export type ImageGenRouterInputs = InferRouterInputs<typeof imageGenRouter>;
