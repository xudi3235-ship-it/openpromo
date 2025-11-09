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
      // 0. start workflow
      await step.do("mark-generating", async () => {
        const g = await EntImageGeneration.fromID(generationId);
        await g.setState("generating");
        await g.dispatchUpdateEvent();
      });

      // Generate image using the same logic as sync mode
      await step.do("generate-image", async () => {
        const g = await EntImageGeneration.fromID(generationId);
        const metadata = g.data.metadata || {};
        await EntImageGeneration.fulfillProductImageWithReference(g, {
          prompt: (metadata.prompt as string | undefined) ?? "",
          referenceImageUrl: metadata?.referenceImageUrl as string | undefined,
          styleId: g.data.styleComponentId ?? metadata?.styleId,
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
