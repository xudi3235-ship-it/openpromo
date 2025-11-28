import type { CoreWorkflowStep } from "@core/helpers/workflow";
import { EntImageGeneration } from "./EntImageGeneration";
import {
  ProductImageGenerator,
  type ProductImageGenResult,
} from "./product-image-generator";

/**
 * ProductImageGenWorkflow - Workflow wrapper around ProductImageGenerator
 *
 * This class wraps the pure ProductImageGenerator logic with workflow steps
 * for durability and state management. Each step is idempotent and can be
 * retried safely.
 *
 * For sync generation without workflow steps, use ProductImageGenerator directly
 * or the `generateProductImage` convenience function.
 */
export class ProductImageGenWorkflow {
  protected step: CoreWorkflowStep;
  protected imageGenID: string;

  constructor(step: CoreWorkflowStep, imageGenID: string) {
    this.step = step;
    this.imageGenID = imageGenID;
  }

  protected async ent() {
    return await EntImageGeneration.fromID(this.imageGenID);
  }

  public async run() {
    // 1. Run the full generation pipeline (prompt + image generation)
    const result = await this.step.do(
      "generate-product-image",
      async (): Promise<ProductImageGenResult> => {
        const ent = await this.ent();
        const generator = await ProductImageGenerator.fromGeneration(ent);
        return await generator.run();
      },
    );
    console.log("1/ Generated product image", {
      generatedPrompt: result.generatedPrompt,
    });

    // 2. Copy to storage and update generation record
    await this.step.do("save-and-update", async () => {
      const ent = await this.ent();

      // Copy the generated image to our internal R2 storage
      const imageUrl = await EntImageGeneration.copyImageToStorage(
        result.imageUrl,
        ent.data.id,
      );

      // Update the generation record
      await ent.update({
        outputImages: [imageUrl],
        state: "completed",
        metadata: {
          ...(ent.data.metadata ?? {}),
          generatedPrompt: result.generatedPrompt,
          inputImages: result.inputImages,
        },
      });
    });
    console.log("2/ Saved image and updated generation record");
  }
}
