import { openai } from "@ai-sdk/openai";
import { replicate } from "@core/providers/replicate";
import { generateObject, type ImagePart } from "ai";
import z from "zod";

export namespace GenAI {
  export async function areInputsSafe(userInput: string, imgs: string[]) {
    const imgParts = imgs.map(
      (i) =>
        ({
          type: "image",
          image: i,
        }) as ImagePart,
    );

    try {
      const res = await generateObject({
        model: openai("gpt-5-mini"),
        schema: z.object({
          safe: z.boolean(),
          reason: z.string().optional(),
        }),
        temperature: 0,
        maxOutputTokens: 100,
        messages: [
          {
            role: "system",
            content: `You are a content moderation AI. Analyze the provided image URLs and determine if any contain inappropriate content such as nudity, violence, or hate symbols. Respond with a JSON object indicating whether the content is safe or not. ONLY give reason if content is NOT safe.

            FOLLOW the output schema strictly.
          `,
          },
          {
            role: "user",
            content: [
              ...imgParts,
              {
                type: "text",
                text: userInput,
              },
            ],
          },
        ],
      });

      return res.object;
    } catch (error) {
      console.error("Error during content moderation", error);
      // On error, assume content is safe to avoid blocking
      return { safe: true };
    }
  }

  // -----------------------------------------------------------
  // helpers to call replicate image providers
  // -----------------------------------------------------------
  export async function runIdeogramV3Turbo(opts: {
    prompt: string;
    imageRefs?: string[];
  }) {
    const input = {
      prompt: opts.prompt,
      aspect_ratio: "1:1",
      // style references
      style_reference_images: opts.imageRefs,
    };
    console.log("generating image with input", input);

    const output = await replicate.run("ideogram-ai/ideogram-v3-turbo", {
      input,
    });

    // @ts-expect-error,
    const imageUrl = output.url();
    return imageUrl ? String(imageUrl) : null;
  }

  export async function runSeedreamV4(opts: {
    prompt: string;
    imageRefs?: string[];
  }) {
    const input = {
      prompt: opts.prompt,
      image_input: opts.imageRefs,
      aspect_ratio: "3:4",
    };
    console.log("generating image with input", input);
    const output = await replicate.run("bytedance/seedream-4", {
      input,
    });
    console.log("seedream output", output);
    // @ts-expect-error,
    const imageUrl = output[0].url();
    return imageUrl ? String(imageUrl) : null;
  }
}
