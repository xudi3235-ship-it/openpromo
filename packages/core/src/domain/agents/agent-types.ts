import z from "zod";

/**
 * defines structued output for our videogen agent
 */
export const AgentOutput = z.object({
  finalVideoUrl: z.string().url().optional(),
});

export type AgentOutput = z.infer<typeof AgentOutput>;
