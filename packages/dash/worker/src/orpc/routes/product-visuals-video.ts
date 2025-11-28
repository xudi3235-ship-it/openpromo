import { EntProduct } from "@core/domain/product";
import { EntVideoGeneration } from "@core/domain/video-generation";
import { Actor } from "@core/helpers/actor";
import { Binding } from "@core/helpers/api-env";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { z } from "zod";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

const productVisualsVideoInput = createWorkspaceInputSchema(
  z.object({
    productId: z.string().min(1, "Product is required"),
    styleComponentId: z.string().optional(),
    instructions: z.string().min(1, "Instructions are required"),
    maxTurns: z.number().int().min(20).max(120).default(60),
    avatarImageUrl: z.string().url().optional(),
  }),
);

const getProductImageUrls = (product: EntProduct) => {
  return product.data.attachments
    .filter((attachment) => attachment.type === "photo")
    .map(
      (attachment) =>
        attachment.thumbnailUrl ||
        attachment.publicUrl ||
        attachment.presignedUrl ||
        "",
    )
    .filter((url): url is string => url.length > 0);
};

const buildPrompt = (params: {
  product: EntProduct;
  instructions: string;
  maxTurns: number;
}) => {
  const { product, instructions, maxTurns } = params;
  const sections = [
    `Product: ${(product.data.name || product.data.id).trim()}`,
    product.data.description?.trim()
      ? `Description: ${product.data.description.trim()}`
      : null,
    instructions.trim() ? `Instructions: ${instructions.trim()}` : null,
    `Max turns: ${maxTurns}`,
  ];
  return sections.filter(Boolean).join("\n\n");
};

export const startProductVisualsVideo = orpcBuilder
  .input(productVisualsVideoInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const {
      productId,
      instructions,
      maxTurns,
      styleComponentId,
      avatarImageUrl,
    } = input;

    const product = await EntProduct.fromID(productId);
    const productImages = getProductImageUrls(product);

    if (productImages.length === 0) {
      throw new Error(
        "Selected product needs at least one photo before generating video",
      );
    }

    const prompt = buildPrompt({ product, instructions, maxTurns });
    const avatarImages = avatarImageUrl ? [avatarImageUrl] : [];

    const generation = await EntVideoGeneration.create({
      state: "not_started",
      productId,
      styleComponentId: styleComponentId ?? null,
      metadata: {
        prompt,
        instructions,
        maxTurns,
        productImages,
        avatarImages,
        productId,
        styleComponentId: styleComponentId ?? undefined,
      },
    });

    const actor = Actor.assert("workspace_user");
    await Binding.use().VideoGenerationWorkflow.create({
      params: {
        actor,
        generationId: generation.data.id,
      },
    });

    await generation.dispatchUpdateEvent();

    return {
      generationId: generation.data.id,
      state: generation.data.state,
      generation: generation.toJSON(),
    };
  });

export const productVisualsVideoRouter = {
  start: startProductVisualsVideo,
};

export type ProductVisualsVideoRouterOutputs = InferRouterOutputs<
  typeof productVisualsVideoRouter
>;
export type ProductVisualsVideoRouterInputs = InferRouterInputs<
  typeof productVisualsVideoRouter
>;
