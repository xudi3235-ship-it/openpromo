import z from "zod";

/**
 * Unified structured output that keeps stage-specific metadata while staying JSON-schema friendly.
 */
export const AgentOutput = z.object({
  status: z.enum(["success", "error"]),
  finalVideoUrl: z.string().url().nullable().optional(),
  error: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
});

export type AgentOutput = z.infer<typeof AgentOutput>;

export {
  EchoToolOutput,
  ImageEvalToolOutput,
  ImageGenToolOutput,
  maybeParseToolOutput,
  NanoBananaToolOutput,
  onToolOutput,
  ToolOutputs,
  VideoGenToolOutput,
} from "@shared/agents/tool-outputs";
