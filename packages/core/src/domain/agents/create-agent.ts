import type { Agent } from "@openai/agents";
import type { OrchestratorSchema } from "@shared/agents";
import type { VideoGenAgentContext } from "./context";
import { createVideoGenAgent } from "./create-video-agent";
import { createImageGenWithRefAgent } from "./subagents/image-gen-with-ref";

export { PromptFragments } from "./prompt-fragments";

// biome-ignore lint/suspicious/noExplicitAny: Agent output types vary by agent
type AnyAgent = Agent<VideoGenAgentContext, any>;

/**
 * Agent registry - maps agent type names to factory functions.
 * Enables dynamic agent instantiation in the run loop.
 */
export const AGENT_REGISTRY: Record<
  OrchestratorSchema.AgentType,
  () => AnyAgent
> = {
  image_gen: createImageGenWithRefAgent,
  video_gen: () => {
    return createVideoGenAgent();
  },
  // Future agents - placeholder implementations
  subtitle_gen: () => {
    throw new Error("subtitle_gen agent not yet implemented");
  },
  audio_gen: () => {
    throw new Error("audio_gen agent not yet implemented");
  },
};
