/**
 * Runtime context for video generation agent.
 * Ported from Python: src/openai_agent/context.py
 */

import { VideoGenRealtime } from "@shared/agents";
import z from "zod";

export const VideoGenAgentContext = z.object({
  // raw user input
  input: VideoGenRealtime.SetInput.shape.data,
  // below are agent context for each run. NOTE: mutable object
  // Stages align with OrchestratorSchema.AgentType + create_plan
  stage: z
    .enum([
      "create_plan",
      "image_gen",
      "video_gen",
      "subtitle_gen",
      "audio_gen",
    ])
    .default("create_plan"),
  plan: z.string(),
});

export type VideoGenAgentContext = z.infer<typeof VideoGenAgentContext>;
