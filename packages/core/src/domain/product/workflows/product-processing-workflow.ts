import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";
import z from "zod";

const ProductProcessingWorkflowParams = z.object({
  actor: Actor.WorkspaceUserSchema,
  productId: z.string(),
});

export type ProductProcessingWorkflowParams = z.infer<
  typeof ProductProcessingWorkflowParams
>;

const log = Log.create({ namespace: "product-workflow" });

export class ProductProcessingWorkflow extends CoreWorkflowEntrypoint<ProductProcessingWorkflowParams> {
  async runWithContext(
    _ctx: CoreWorkflowContext,
    _event: CoreWorkflowEvent<ProductProcessingWorkflowParams>,
    step: CoreWorkflowStep,
  ) {
    log.info("Starting product processing workflow");
    try {
      console.log("// Processing product");
    } catch (error) {
      // Handle workflow errors
      await step.do("mark-product-failed", async () => {
        const err = error instanceof Error ? error : new Error(String(error));
        log.error(err);
        // TODO: Update product state to "failed"
        // TODO: Set stateMessage with error details
        return { state: "failed" as const };
      });

      throw error;
    }
  }
}
