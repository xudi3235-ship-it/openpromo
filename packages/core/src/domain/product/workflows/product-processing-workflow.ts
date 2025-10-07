import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";
import z from "zod";
import { EntProduct } from "../entity";

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
    event: CoreWorkflowEvent<ProductProcessingWorkflowParams>,
    step: CoreWorkflowStep,
  ) {
    const { productId } = event.payload;
    log.info("// Starting product processing workflow");
    try {
      console.log("// Processing product");
      // 1. Mark product as processing
      await step.do("mark-product-processing", async () => {
        const product = await EntProduct.fromID(productId);
        await product.setState("processing");
        return;
      });
      // 2. process attachments
      await processAttachments(step, productId);
    } catch (error) {
      // Handle workflow errors
      await step.do("mark-product-failed", async () => {
        const product = await EntProduct.fromID(productId);
        const err = error instanceof Error ? error : new Error(String(error));
        log.error(err);
        await product.setState("failed", `Workflow error: ${err}`);
        return;
      });

      throw error;
    }
  }
}

async function processAttachments(step: CoreWorkflowStep, productId: string) {
  // 1. for now assume just images
  await step.do("generate meta for imgs", async () => {
    await EntProduct.fromID(productId);
  });
}
