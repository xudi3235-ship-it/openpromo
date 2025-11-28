// Use orval generated client and Zod schemas

import { EntVideoGeneration } from "@core/domain/video-generation";
import { Actor } from "@core/helpers/actor";
import { Binding } from "@core/helpers/api-env";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import * as z from "zod";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

// ============ Workflow-based video generation ============

const startVideoGenInput = createWorkspaceInputSchema(
  z.object({
    productId: z.string().optional(),
    prompt: z.string().min(1, "Prompt is required"),
    productImages: z
      .array(z.string().url("Product image must be a valid URL"))
      .min(1, "Provide at least one product image"),
    avatarImages: z
      .array(z.string().url("Avatar image must be a valid URL"))
      .default([]),
    styleComponentId: z.string().optional(),
  }),
);

/**
 * Start a video generation workflow.
 * Creates a generation record and kicks off the Cloudflare Workflow.
 */
export const startVideoGeneration = orpcBuilder
  .input(startVideoGenInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const { productId, prompt, productImages, avatarImages, styleComponentId } =
      input;

    // Create the generation record
    const generation = await EntVideoGeneration.create({
      state: "not_started",
      productId: productId ?? null,
      styleComponentId: styleComponentId ?? null,
      metadata: {
        prompt,
        productImages,
        avatarImages: avatarImages ?? [],
      },
    });

    // Kick off the workflow
    const actor = Actor.assert("workspace_user");
    await Binding.use().VideoGenerationWorkflow.create({
      params: {
        actor,
        generationId: generation.data.id,
      },
    });

    // Dispatch initial event
    await generation.dispatchUpdateEvent();

    return {
      generationId: generation.data.id,
      state: generation.data.state,
      generation: generation.toJSON(),
    };
  });

const getVideoGenInput = createWorkspaceInputSchema(
  z.object({
    generationId: z.string().min(1, "generationId is required"),
  }),
);

const deleteVideoGenInput = createWorkspaceInputSchema(
  z.object({
    ids: z.array(z.string().min(1)).min(1),
  }),
);

/**
 * Get the status of a video generation.
 */
export const getVideoGeneration = orpcBuilder
  .input(getVideoGenInput)
  .use(withWorkspaceRole, workspaceRoleMappers.viewer)
  .handler(async ({ input }) => {
    const { generationId } = input;

    const generation = await EntVideoGeneration.fromID(generationId);

    return {
      generationId: generation.data.id,
      state: generation.data.state,
      stateMessage: generation.data.stateMessage,
      outputVideoUrl: generation.data.outputVideoUrl,
      generation: generation.toJSON(),
    };
  });

/**
 * Delete video generations in batch.
 */
export const deleteVideoGenerationsBatch = orpcBuilder
  .input(deleteVideoGenInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const { ids } = input;
    return EntVideoGeneration.deleteBatch(ids);
  });

export const videoGenRouter = {
  start: startVideoGeneration,
  get: getVideoGeneration,
  deleteBatch: deleteVideoGenerationsBatch,
};

export type VideoGenRouterOutputs = InferRouterOutputs<typeof videoGenRouter>;
export type VideoGenRouterInputs = InferRouterInputs<typeof videoGenRouter>;
