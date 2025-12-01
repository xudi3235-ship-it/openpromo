import z from "zod";

const AgentStage = z.enum(["image_gen", "video_gen"]);
const StageStatus = z.enum(["running", "succeeded", "failed"]);

/**
 * Unified structured output that keeps stage-specific metadata while staying JSON-schema friendly.
 */
export const AgentOutput = z.object({
  stage: AgentStage,
  status: StageStatus,
  summary: z.string().nullable().optional(),
  generatedCount: z.number().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
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
