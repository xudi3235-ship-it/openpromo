import { openai } from "@ai-sdk/openai";
import { replicate } from "@core/providers/replicate";
import { ProductIdentificationSchema } from "@shared/product";
import { generateObject, type ModelMessage, type UserModelMessage } from "ai";
import { z } from "zod";
import type { EntProduct } from "../product";
import type { EntStyleComponent } from "../style-component";

export namespace ProductImageGen {
  export const DEFAULT_NEGATIVE_PROMPT =
    "low quality, blurry, deformed, distorted, disfigured, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, mutated, extra limbs";

  export interface GeneratedImageResult {
    imageUrls: string[];
    prompt: string;
    negativePrompt?: string;
    metadata?: Record<string, unknown>;
  }

  /**
   *
   * for generating ready-to-use product images
   * image gen architecture design:
   *
   * Product 1..N Assets each product also 1..N Variant.
   *
   * When product created, kick off workflow to consume and prepare the assets. Tasks involved:
   * 1. identify the product/service/etc that users are selling.
   * 2. pre-process the assets, e.g. extract the product and generate image without messy background.
   * 3. store these as `context` which will be used in generation.
   *
   *
   * Components needed for a ImageGen system:
   *
   * A. Background.
   * B. Subject. -> here is the product.
   * C. Foreground (optional).
   * D. Avatar (optional). the person/UGC model.
   * E. (shared) Context. e.g. lighting, style, etc. shared across each components.
   *
   * The e2e flow is as follows:
   * 1. product created, we process the asssets, generate the context.
   * 2. transform the context + product to a image gen prompt.
   * 3. generate the image with the prompt.
   */

  export async function identifyProduct(product: EntProduct) {
    const res = await generateObject({
      model: openai("gpt-5-mini"),
      schema: ProductIdentificationSchema,
      temperature: 0,
      maxOutputTokens: 1000,
      messages: [
        {
          role: "system",
          content: `you are an expert in helping identify product that users are trying to sell. You will be given a list of images, and you will try your best to identify the product and provide the metadata. If no valid product is identified, you should set hasValidProduct to false and provide the reason in errorReason.

          Users are SMBs trying to grow their business. This is crucial to my career. fill in the product details as best as you can. These output will be used as context, to help improve the images.

          Closely follow the schema and the rules below.

          Rules:
          1. industry and category should be very specific. description to be concise and informative. fill out metadata as best as you can.
          
          `,
        },
        ...attachmentsToMessages(product),
      ],
    });
    console.log("identifyProduct result", res);
    return res.object;
  }

  export async function genImage(opts: {
    product: EntProduct;
    style: EntStyleComponent;
    prompt: string;
  }): Promise<GeneratedImageResult> {
    const negativePrompt = DEFAULT_NEGATIVE_PROMPT;
    const sysPrompt = `MUST follow the style references provided, including lighting, shooting styles, composition, etc.
    ${opts.prompt}
    negative prompt: ${negativePrompt}
    `;
    const input = {
      prompt: sysPrompt,
      aspect_ratio: "1:1",
      // style references
      style_reference_images: opts.style.data.imageRefs,
    };
    console.log("generating image with input", input);

    const output = await replicate.run("ideogram-ai/ideogram-v3-turbo", {
      input,
    });

    // @ts-expect-error,
    const imageUrl = output.url();

    const imageUrls = imageUrl ? [String(imageUrl)] : [];

    return {
      imageUrls,
      prompt: sysPrompt,
      negativePrompt,
      metadata: {
        replicateInput: input,
        styleName: opts.style.data.name,
        productId: opts.product.data.id,
      },
    };
  }

  // ------------------------------------------------------------------------
  // helpers
  // ------------------------------------------------------------------------
  export async function selectOptimalStyleForProduct(
    product: EntProduct,
    styles: EntStyleComponent[],
  ): Promise<{ style: EntStyleComponent; imageGenPrompt: string }> {
    if (styles.length === 0) {
      throw new Error("No styles available for matching");
    }

    const styleSummaries = styles.map((style) => ({
      id: style.data.id,
      name: style.data.name,
      slug: style.data.slug,
      description: style.data.description,
      imageGenPrompt: style.data.imageGenPrompt,
      context: style.data.context,
    }));

    const systemPrompt = `You are a senior social ad creative director. Review the product data and select the most effective visual style from the provided options that matches with the product, its audience, and marketing needs. This style will later be used to generate ad creatives for this product. You'll also generate an image prompt that will be used to generate ad creative, using the product n style as context.

    The image prompt is the most critical part. Detailed, effective, specific, about what the image ad creative look like, including composition, lighting, style, and how the product is featured/shown, design it to best maximize the conversion/sales leveraging the style ctx.

e.g. "style_requirement": "studio shot, clean lighting, premium skincare aesthetic"

build on top of this baseline template and adjust as needed to fit the product n style:
"template": "A {lighting_style} {scene_type} image of {num_people} {model_description} {interaction} with the {product_name}, emphasizing {product_features} and {visual_focus}. The overall tone is {mood} and {style_keywords}. {extra_details}, {lighting_details}, {composition_details}, {color_scheme}."


Examples:
A soft, editorial, high-key studio portrait shot of one korean female model gently applying the hydrating serum to her cheek, emphasizing skin luminosity and bottle reflection. The overall tone is premium, calm, and moist-glow.

RULES:
- Only choose styles from the provided list, must return a valid styleId from the list.
- Do not invent new objects or scenes outside the given Style Reference.
- Always preserve product realism and accurate material details.
- Ensure composition, lighting, and tone align with the Style Reference.
- Focus on product interaction and emotional tone as described.
`;
    const { object } = await generateObject({
      model: openai("gpt-5-mini"),
      schema: z.object({
        styleId: z.string().min(1),
        imageGenPrompt: z
          .string()
          .min(20)
          .describe(
            "the image generation prompt will be used to generate the ad creative, must be detailed and specific",
          ),
      }),
      temperature: 0.2,
      maxOutputTokens: 2000,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Available styles:\n${JSON.stringify(styleSummaries, null, 2)}\n\nProduct details:\n${JSON.stringify(product.data, null, 2)}`,
        },
      ],
    });

    const matchedStyle = styles.find(
      (style) => style.data.id === object.styleId,
    );

    if (!matchedStyle) {
      throw new Error(`Matched style ${object.styleId} no longer available`);
    }

    return { style: matchedStyle, imageGenPrompt: object.imageGenPrompt };
  }

  function attachmentsToMessages(product: EntProduct): ModelMessage[] {
    // map the attachments to messages
    const messages = product.data.attachments
      .map((att) => {
        if (att.type !== "photo") {
          console.error("unsupported attachment type", att);
          return null;
        }
        if (!att.publicUrl) {
          console.error("attachment missing publicUrl", att);
          return null;
        }
        return {
          role: "user",
          content: [
            {
              type: "image",
              image: att.publicUrl,
            },
          ],
        } satisfies UserModelMessage;
      })
      .filter((m) => !!m);
    return messages;
  }
}
