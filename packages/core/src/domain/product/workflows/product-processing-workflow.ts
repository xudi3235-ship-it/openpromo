import { ProductImageGen } from "@core/domain/genai";
import { GenAI } from "@core/domain/genai/helpers";
import { Actor } from "@core/helpers/actor";
import {
  type CoreWorkflowContext,
  CoreWorkflowEntrypoint,
  type CoreWorkflowEvent,
  type CoreWorkflowStep,
} from "@core/helpers/workflow";
import { Log } from "@core/utils/log";
import z from "zod";
import { EntProduct } from "../EntProduct";

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
        console.log("marked product as processing");
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
  // 1. identify product
  const { hasValidProduct, errorReason, productContext } = await step.do(
    "generate meta for imgs",
    async () => {
      console.log("identifying product");
      const p = await EntProduct.fromID(productId);
      return await ProductImageGen.identifyProduct(p);
    },
  );
  console.log("identified product", {
    hasValidProduct,
    errorReason,
    productContext,
  });

  if (!hasValidProduct) {
    // mark product as invalid
    await step.do("mark-product-invalid", async () => {
      const p = await EntProduct.fromID(productId);
      await p.setState(
        "failed",
        `Invalid product: ${errorReason ?? "unknown"}`,
      );
      return;
    });
    log.info("// Product is invalid, stopping workflow");
    return;
  }
  console.log("identified product context", productContext);

  // 2. pre-generate the image variants, e.g. no background.
  await step.do("pre-generate-img-variants", async () => {
    const p = await EntProduct.fromID(productId);
    const prompt = `create a clean, well-lit product image of ${p.data.name} on a plain white background, ensuring the product is clearly visible and centered. The image should be high-resolution, with accurate colors and sharp details, suitable for e-commerce display.`;

    const imgs = p.imageUrls();
    if (imgs.length === 0) {
      console.error(`no images to process for product ${p.data.id}`);
      return;
    }
    const noBgUrl = await GenAI.runNanoBanana({ prompt, image_input: imgs });

    console.log("no background url", noBgUrl);

    // save to product
    await p.setImageVariants({ noBg: noBgUrl });
    return;
  });
  console.log("pre-generated image variants");
  // 3. save meta to product and mark as ready
  await step.do("producty-ready", async () => {
    const p = await EntProduct.fromID(productId);
    await p.update({
      state: "ready",
      metadata: {
        ...p.data.metadata,
        productContext,
      },
    });
    return;
  });
}
