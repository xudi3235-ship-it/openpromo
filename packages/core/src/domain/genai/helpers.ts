import { openai } from "@ai-sdk/openai";
import { replicate } from "@core/providers/replicate";
import { generateObject, type ImagePart } from "ai";
import type { FileOutput } from "replicate";
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

  export async function runNanoBanana(
    opts: {
      prompt: string;
      image_input?: string[];
      aspect_ratio?:
        | "1:1"
        | "2:3"
        | "3:2"
        | "3:4"
        | "4:3"
        | "16:9"
        | "9:16"
        | "match_input_image";
      output_format?: "png" | "jpg";
      use_pro: boolean;
    } = {
      prompt: "",
      aspect_ratio: "match_input_image",
      output_format: "jpg",
      use_pro: true,
    },
  ) {
    const input = {
      prompt: opts.prompt,
      image_input: opts.image_input,
      aspect_ratio: opts.aspect_ratio,
    };
    console.log("generating image with input", input);
    const modelID = opts.use_pro
      ? "google/nano-banana-pro"
      : "google/nano-banana";
    const output = (await replicate.run(modelID, {
      input,
    })) as FileOutput;
    console.log("nanobanana output", output);
    const imageUrl = output.url();
    return String(imageUrl);
  }
}
