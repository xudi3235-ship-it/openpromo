import z from "zod";

/**
 * Unified structured output that keeps stage-specific metadata while staying JSON-schema friendly.
 */
export const AgentOutput = z.object({
  status: z.enum(["success", "error"]),
  finalVideoUrl: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
});

export type AgentOutput = z.infer<typeof AgentOutput>;

export type { ToolNameType } from "@shared/agents/tool-outputs";
export {
  EchoToolOutput,
  ImageEvalToolOutput,
  maybeParseToolOutput,
  NanoBananaToolOutput,
  onToolOutput,
  SoraStoryboardToolOutput,
  TmpFsToolOutput,
  ToolOutputs,
  Veo31ImageToVideoToolOutput,
  Veo31ReferenceImagesToVideoToolOutput,
  Veo31TextToVideoToolOutput,
  Veo31VideoExtensionToolOutput,
  VirtualShellToolOutput,
} from "@shared/agents/tool-outputs";
