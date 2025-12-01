/**
 * Runtime context for video generation agent.
 * Ported from Python: src/openai_agent/context.py
 */

import { VideoGenRealtime } from "@shared/agents";
import z from "zod";

// context for agent
// passed to tool, and
export const VideoGenAgentContext = z.object({
  // input
  input: VideoGenRealtime.SetInput.shape.data,
});

export type VideoGenAgentContext = z.infer<typeof VideoGenAgentContext>;
