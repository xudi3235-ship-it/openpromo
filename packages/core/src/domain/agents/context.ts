/**
 * Runtime context for video generation agent.
 * Ported from Python: src/openai_agent/context.py
 */

import z from "zod";

// context for agent
// passed to tool, and
export const VideoGenAgentContext = z.object({
  // initial input for video gen
  input: z.object({
    product: z.string().describe("product ctx"),
    productImages: z.array(z.url()).describe("URLs of product images"),
    business: z.string().describe("business ctx"),
  }),
});

export type VideoGenAgentContext = z.infer<typeof VideoGenAgentContext>;
