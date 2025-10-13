import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";
import { z } from "zod";

const ImageGenerationWorkflowParams = z.object({
  actor: Actor.WorkspaceUserSchema,
  generationId: z.string(),
});

export type ImageGenerationWorkflowParams = z.infer<
  typeof ImageGenerationWorkflowParams
>;

const log = Log.create({ namespace: "image-generation-workflow" });

export class ImageGenerationWorkflow extends CoreWorkflowEntrypoint<ImageGenerationWorkflowParams> {
  async runWithContext(
    _ctx: CoreWorkflowContext,
    event: CoreWorkflowEvent<ImageGenerationWorkflowParams>,
    _step: CoreWorkflowStep,
  ) {
    const { generationId } = event.payload;
    log.info("// Starting image generation workflow", { generationId });
  }
}
