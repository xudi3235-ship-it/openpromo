import { Presets } from "@core/domain/agents/presets";
import { EntImageGeneration } from "@core/domain/image-generation";
import { EntVideoGeneration } from "@core/domain/video-generation";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { z } from "zod";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

const batchDeleteProductVisualsInput = createWorkspaceInputSchema(
  z.object({
    imageIds: z.array(z.string().min(1)).default([]),
    videoIds: z.array(z.string().min(1)).default([]),
  }),
);

export const batchDeleteProductVisuals = orpcBuilder
  .input(batchDeleteProductVisualsInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const { imageIds, videoIds } = input;

    const [imageResult, videoResult] = await Promise.all([
      imageIds.length > 0
        ? EntImageGeneration.deleteBatch(imageIds)
        : Promise.resolve({ deletedCount: 0 }),
      videoIds.length > 0
        ? EntVideoGeneration.deleteBatch(videoIds)
        : Promise.resolve({ deletedCount: 0 }),
    ]);

    const totalDeleted = imageResult.deletedCount + videoResult.deletedCount;

    return {
      deletedCount: totalDeleted,
      imageDeleted: imageResult.deletedCount,
      videoDeleted: videoResult.deletedCount,
    };
  });

/**
 * Get all available presets for product visuals
 */
export const getPresets = orpcBuilder
  .input(createWorkspaceInputSchema(z.object({})))
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async () => {
    const presetManager = new Presets.Manager();
    const presets = await presetManager.loadClientPresets();

    return {
      presets,
    };
  });

export const productVisualsRouter = {
  batchDelete: batchDeleteProductVisuals,
  presets: getPresets,
};

export type ProductVisualsRouterOutputs = InferRouterOutputs<
  typeof productVisualsRouter
>;
export type ProductVisualsRouterInputs = InferRouterInputs<
  typeof productVisualsRouter
>;
