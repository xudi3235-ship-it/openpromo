import { ProductImageGen } from "@core/domain/genai";
import { EntProduct } from "@core/domain/product";
import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";
import { z } from "zod";
import { EntImageGeneration } from "../EntImageGeneration";

const ImageGenerationWorkflowParams = z.object({
  actor: Actor.WorkspaceUserSchema,
  generationId: z.string(),
});

export type ImageGenerationWorkflowParams = z.infer<
  typeof ImageGenerationWorkflowParams
>;

const log = Log.create({ namespace: "image-generation-workflow" });

/**
 * TODO: WIP - Image Generation Workflow
 *
 * This workflow runs asynchronously in the background and dispatches WebSocket events.
 * However, the WebSocket event handling infrastructure is NOT stable yet:
 * - Client-side event listeners create duplicate connections
 * - Event dispatching needs refactoring
 *
 * Current behavior:
 * - Workflow runs successfully and updates generation records
 * - dispatchUpdateEvent() calls work but client-side handling is disabled
 * - Clients should poll generation records or wait for stable WebSocket infrastructure
 */
export class ImageGenerationWorkflow extends CoreWorkflowEntrypoint<ImageGenerationWorkflowParams> {
  async runWithContext(
    _ctx: CoreWorkflowContext,
    event: CoreWorkflowEvent<ImageGenerationWorkflowParams>,
    step: CoreWorkflowStep,
  ) {
    const { generationId } = event.payload;
    log.info("// Starting image generation workflow", { generationId });

    try {
      // 0. Fetch the generation record
      const gen = await step.do("fetch-generation", async () => {
        return (await EntImageGeneration.fromID(generationId)).toJSON();
      });

      const productID = gen.productId;

      if (!gen) throw new Error("Generation not found");
      if (!productID) throw new Error("Generation has no product ID");

      // 1. derive style ctx
      const styleCtx = await step.do("derive-style-ctx", async () => {
        const ent = await EntImageGeneration.fromID(generationId);
        return ent.deriveStyleContext({
          productID,
          // styleId: gen.styleComponentId,
        });
      });
      // 2. mark as generating
      await step.do("mark-generating", async () => {
        const ent = await EntImageGeneration.fromID(generationId);
        await ent.setState("generating");
      });

      // 3. generate image
      const { imageUrls } = await step.do("generate-image", async () => {
        const product = await EntProduct.fromID(productID);
        const out = await ProductImageGen.genImage({
          product,
          style: styleCtx,
        });
        return {
          imageUrls: out.imageUrls,
        };
      });

      // 4. mark as completed, store image URLs and dispatch event
      await step.do("mark-completed", async () => {
        const ent = await EntImageGeneration.fromID(generationId);
        await ent.update({
          state: "completed",
          outputImages: imageUrls,
        });
      });
    } catch (err) {
      console.error("// Image generation workflow failed", {
        generationId,
        error: err,
      });
      // mark as failed and dispatch event
      const ent = await EntImageGeneration.fromID(generationId);
      await ent.setState("failed", (err as Error).message);
      return;
    }
  }
}
