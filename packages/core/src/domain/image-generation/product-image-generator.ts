import { oai } from "@core/providers/openai";
import { filterNulls } from "@core/utils/common";
import type {
  ResponseInput,
  ResponseInputItem,
} from "openai/resources/responses/responses.mjs";
import { GenAI } from "../genai/helpers";
import { EntProduct } from "../product";
import { EntStyleComponent } from "../style-component";
import { EntImageGeneration } from "./EntImageGeneration";

// ------------------------------------------------------------------------
// Types
// ------------------------------------------------------------------------

export interface ProductImageGenContext {
  product: EntProduct;
  styleImages: string[];
  productImages: string[];
  referenceImageUrl?: string;
  prompt: string;
}

/**
 * Result from image generation.
 * This type is intentionally composed of only primitive types (strings)
 * to ensure it's serializable for workflow step results (Rpc.Serializable).
 */
export interface ProductImageGenResult {
  imageUrl: string;
  generatedPrompt: string;
  inputImages: string[];
}

// ------------------------------------------------------------------------
// Pure generation logic - no workflow or database dependencies
// ------------------------------------------------------------------------

/**
 * ProductImageGenerator - Pure generation logic without workflow or DB coupling
 *
 * This class encapsulates the core image generation logic and can be used:
 * 1. Directly in sync request handlers
 * 2. Within workflow steps
 * 3. For testing with mocked dependencies
 */
export class ProductImageGenerator {
  private ctx: ProductImageGenContext;

  constructor(ctx: ProductImageGenContext) {
    this.ctx = ctx;
  }

  /**
   * Build context from an EntImageGeneration record
   */
  static async fromGeneration(
    generation: EntImageGeneration,
  ): Promise<ProductImageGenerator> {
    const productId = generation.data.productId;
    if (!productId) throw new Error("Generation missing product reference");

    const product = await EntProduct.fromID(productId);
    const styleId = generation.data.styleComponentId;
    const metadata = generation.data.metadata ?? {};

    // Get style images if style exists
    let styleImages: string[] = [];
    if (styleId) {
      const style = await EntStyleComponent.fromID(styleId);
      styleImages = style.data.imageRefs;
    }

    // Get product images
    const productImages = Object.values(product.data.imgVariants || {});

    return new ProductImageGenerator({
      product,
      styleImages,
      productImages,
      referenceImageUrl: metadata.referenceImageUrl as string | undefined,
      prompt: (metadata.prompt as string) ?? "",
    });
  }

  /**
   * Build context from explicit params (for sync calls)
   */
  static async fromParams(params: {
    productId: string;
    styleId?: string;
    referenceImageUrl?: string;
    prompt: string;
  }): Promise<ProductImageGenerator> {
    const product = await EntProduct.fromID(params.productId);

    let styleImages: string[] = [];
    if (params.styleId) {
      const style = await EntStyleComponent.fromID(params.styleId);
      styleImages = style.data.imageRefs;
    }

    const productImages = Object.values(product.data.imgVariants || {});

    return new ProductImageGenerator({
      product,
      styleImages,
      productImages,
      referenceImageUrl: params.referenceImageUrl,
      prompt: params.prompt,
    });
  }

  /**
   * Build the response input for the prompt generation API
   */
  private toResponseInput(): ResponseInput {
    const { product, styleImages, referenceImageUrl } = this.ctx;

    const productMsg = {
      role: "user",
      content: [
        {
          type: "input_text",
          text: `and here are the product related img/context. product context: ${JSON.stringify(
            product.data,
            null,
            2,
          )}`,
        },
        {
          type: "input_image",
          image_url: product.data.imgVariants?.noBg as string,
          detail: "auto",
        },
      ],
    } as ResponseInputItem;

    // case 1: style images exist
    if (styleImages.length > 0) {
      return [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `here are the style reference images`,
            },
            ...styleImages.map((url) => ({
              type: "input_image",
              image_url: url,
              detail: "auto",
            })),
          ],
        },
        productMsg,
      ] as ResponseInput;
    }

    // case 2: only reference image exists (ad hoc)
    if (referenceImageUrl) {
      return [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `here are the reference images`,
            },
            {
              type: "input_image",
              image_url: referenceImageUrl,
              detail: "auto",
            },
          ],
        },
        productMsg,
      ] as ResponseInput;
    }

    // case 3: no reference images, just product
    return [productMsg] as ResponseInput;
  }

  /**
   * Get the reference image URLs (style images or reference image)
   */
  private getRefImageUrls(): string[] {
    const { styleImages, referenceImageUrl } = this.ctx;
    if (styleImages.length > 0) {
      return [...styleImages];
    }
    if (referenceImageUrl) {
      return [referenceImageUrl];
    }
    return [];
  }

  /**
   * Generate the image prompt using AI
   */
  async generatePrompt(): Promise<string> {
    const { prompt } = this.ctx;
    const user_input = `first img is the reference image. and rest imgs are my product. ${prompt}`;

    const response = await oai().responses.create({
      prompt: {
        id: "pmpt_68ff0d90439c8196be84f928d5f2546b0df830bb02f714b6",
        variables: {
          user_input,
        },
      },
      input: this.toResponseInput(),
      reasoning: {
        summary: "auto",
      },
      store: true,
    });

    return response.output_text;
  }

  /**
   * Generate the image using Nano Banana
   */
  async generateImage(generatedPrompt: string): Promise<string> {
    const { productImages } = this.ctx;
    const refImages = this.getRefImageUrls();

    const inputImages = filterNulls([...refImages, ...productImages]);

    const externalImageUrl = await GenAI.runNanoBanana({
      prompt: generatedPrompt,
      image_input: inputImages,
    });

    return externalImageUrl;
  }

  /**
   * Run the full generation pipeline (prompt + image)
   */
  async run(): Promise<ProductImageGenResult> {
    const generatedPrompt = await this.generatePrompt();
    console.log("Generated image prompt:", generatedPrompt);

    const externalImageUrl = await this.generateImage(generatedPrompt);

    const { productImages } = this.ctx;
    const refImages = this.getRefImageUrls();

    return {
      imageUrl: externalImageUrl,
      generatedPrompt,
      inputImages: filterNulls([...refImages, ...productImages]),
    };
  }

  /**
   * Get the context for metadata storage
   */
  getMetadata() {
    return {
      prompt: this.ctx.prompt,
      referenceImageUrl: this.ctx.referenceImageUrl,
      styleImages: this.ctx.styleImages,
    };
  }
}

// ------------------------------------------------------------------------
// Convenience functions for common use cases
// ------------------------------------------------------------------------

/**
 * Generate a product image and save to storage
 * This is the main entry point for sync generation
 */
export async function generateProductImage(params: {
  generation: EntImageGeneration;
  productId: string;
  styleId?: string;
  referenceImageUrl?: string;
  prompt: string;
}): Promise<EntImageGeneration> {
  const generator = await ProductImageGenerator.fromParams({
    productId: params.productId,
    styleId: params.styleId,
    referenceImageUrl: params.referenceImageUrl,
    prompt: params.prompt,
  });

  const result = await generator.run();

  // Copy to our storage
  const imageUrl = await EntImageGeneration.copyImageToStorage(
    result.imageUrl,
    params.generation.data.id,
  );

  // Update the generation record
  await params.generation.update({
    outputImages: [imageUrl],
    state: "completed",
    metadata: {
      ...(params.generation.data.metadata ?? {}),
      prompt: params.prompt,
      generatedPrompt: result.generatedPrompt,
      referenceImageUrl: params.referenceImageUrl,
      inputImages: result.inputImages,
    },
  });

  return params.generation;
}
