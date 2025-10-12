import { openai } from "@ai-sdk/openai";
import { env } from "@core/utils/env";
import { ProductIdentificationSchema, StyleComponent } from "@shared/product";
import { generateObject, type ModelMessage, type UserModelMessage } from "ai";
import Replicate from "replicate";
import type { EntProduct } from "../product";
import { allStyleComponents } from "./styles";

const replicate = new Replicate({
  auth: env.REPLICATE_API_TOKEN,
});

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

  export async function matchProductWithStyles(
    product: EntProduct,
  ): Promise<StyleComponent> {
    // 2. for a ready product, we do a matching and find the best style
    const sysPrompt = `You are an expert in social media marketing n trend analysis and building effective ads creative. You will read the product's context(details, industry, category, etc) and try to find it with the best matching style. This style will contain a couple images that can be used as style of reference for producing good product images. Each style has its own suitable usecases and scnearios.

    Examples: close-up studio shot of korean super model, real skin texture and natural glow -> this is suitable for all beuty products, skincare product, makeups, etc. 

    // styles available:
    ${Array.from(allStyleComponents.values())}

    RULES:
    1. you have to select one, even there's no perfect match.
    2. pick the one that is the most suitable for the product's industry and category
    3. You will also generate the image gen prompt!! it should be a paragraph that uses verbs n adjectives to describe the final image to produce, including the product and how it shows up/positioned in along with the style(which might have avatar).
    4. for portrait related styles, ensure the prompt specifiy the realisitc skin texture and natural glow.
    `;
    const res = await generateObject({
      model: openai("gpt-5-mini"),
      schema: StyleComponent.pick({
        name: true,
        imageGenPrompt: true,
      }),
      temperature: 0.2,
      maxOutputTokens: 3000,
      messages: [
        {
          role: "system",
          content: sysPrompt,
        },
        {
          role: "user",
          content: `product details: ${JSON.stringify(product.data)}`,
        },
      ],
    });
    const styleName = res.object.name;

    const style = allStyleComponents.get(styleName);
    if (!style) throw new Error(`style not found: ${styleName}`);
    console.log({ resp: res.object });
    return { ...style, imageGenPrompt: res.object.imageGenPrompt };
  }

  export async function genImage(opts: {
    product: EntProduct;
    style: StyleComponent;
  }): Promise<string> {
    // TODO: need to generate this prompt
    const sysPrompt = `MUST follow the style references provided, including lighting, shooting styles, composition, etc.
    ${opts.style.imageGenPrompt}
    negative prompt: low quality, blurry, deformed, distorted, disfigured, out of frame, worst quality, low quality, jpeg artifacts, ugly, duplicate, morbid, mutilated, mutated, extra limbs
    `;
    const input = {
      prompt: sysPrompt,
      aspect_ratio: "1:1",
      // style references
      style_reference_images: opts.style.imageRefs,
    };
    console.log("generating image with input", input);

    const output = await replicate.run("ideogram-ai/ideogram-v3-turbo", {
      input,
    });

    // @ts-expect-error,
    const url = output.url();
    return url as string;
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
