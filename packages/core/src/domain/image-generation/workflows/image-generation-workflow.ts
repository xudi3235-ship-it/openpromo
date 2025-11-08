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
 * Image Generation Workflow
 *
 * This workflow runs asynchronously in the background and dispatches WebSocket events
 * at each state transition (pending → generating → completed/failed).
 *
 * Behavior:
 * - Workflow is triggered via ImageGenerationWorkflow.create()
 * - Updates generation state and dispatches events at each step
 * - Clients receive real-time updates via useWorkspaceEvents hook
 * - Falls back to sync generation in local development (VITE_ENVIRONMENT=local)
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
      const generation = await step.do("fetch-generation", async () => {
        return EntImageGeneration.fromID(generationId);
      });

      if (!generation.data.productId) {
        throw new Error("Generation has no product ID");
      }

      const metadata = (generation.data.metadata ?? {}) as Record<
        string,
        unknown
      >;
      const mode = metadata.mode === "style" ? "style" : "studio";

      // Mark as generating and dispatch event
      await step.do("mark-generating", async () => {
        await generation.setState("generating");
        await generation.dispatchUpdateEvent();
      });

      // Generate image using the same logic as sync mode
      await step.do("generate-image", async () => {
        if (mode === "studio") {
          await EntImageGeneration.fulfillStudioBackgroundGeneration(
            generation,
            (metadata.prompt as string | undefined) ?? undefined,
          );
          return;
        }

        await EntImageGeneration.fulfillProductImageWithReference(generation, {
          prompt: (metadata.prompt as string | undefined) ?? "",
          referenceImageUrl: metadata.referenceImageUrl as string | undefined,
          styleId:
            generation.data.styleComponentId ||
            (metadata.styleId as string | undefined),
        });
      });

      // Dispatch completion event with refreshed data
      await step.do("mark-completed", async () => {
        const refreshed = await EntImageGeneration.fromID(generationId);
        await refreshed.dispatchUpdateEvent();
      });
    } catch (err) {
      console.error("// Image generation workflow failed", {
        generationId,
        error: err,
      });
      // mark as failed and dispatch event
      await step.do("mark-failed", async () => {
        const ent = await EntImageGeneration.fromID(generationId);
        await ent.setState("failed", (err as Error).message);
        await ent.dispatchUpdateEvent();
      });
      return;
    }
  }
}
