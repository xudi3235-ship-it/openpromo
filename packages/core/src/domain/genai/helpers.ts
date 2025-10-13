import { openai } from "@ai-sdk/openai";
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
  }
}
