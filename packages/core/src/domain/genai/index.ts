import { openai } from "@ai-sdk/openai";
import { ProductIdentificationSchema } from "@shared/product";
import { generateObject, type ModelMessage, type UserModelMessage } from "ai";
import type { EntProduct } from "../product";

export namespace ProductImageGen {
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
      model: openai("gpt-5-nano"),
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

  export async function genPromptForImageGen(_product: EntProduct) {
    // this will read the product info and prepare a prompt for image gen.
    // which will be used to produce an image.
    // TODO: implement
  }

  export async function genImage() {
    // TODO: implement
  }

  // ------------------------------------------------------------------------
  // helpers
  // ------------------------------------------------------------------------
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
