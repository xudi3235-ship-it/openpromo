import { openai } from "@ai-sdk/openai";
import { generateObject, type ModelMessage } from "ai";
import z from "zod";

// grouping related helpers
export async function areInputsSafe(userInput: string, imgs: string[]) {
  const res = await generateObject({
    model: openai("gpt-5-mini"),
    schema: z.object({
      safe: z.boolean(),
      reason: z.string().optional(),
    }),
    temperature: 0,
    maxOutputTokens: 200,
    messages: [
      {
        role: "system",
        content: `You are a content moderation AI. Analyze the provided image URLs and determine if any contain inappropriate content such as nudity, violence, or hate symbols. Respond with a JSON object indicating whether the content is safe or not.
          `,
      },
      {
        role: "user",
        content: `User input: ${userInput}`,
      },
      ...toMsgs(imgs),
    ],
  });
  return res.object;
}

function toMsgs(imgs: string[]) {
  return imgs.map((url) => ({
    role: "user",
    content: `Image URL: ${url}`,
    type: "image",
    image_url: url,
  })) as ModelMessage[];
}
