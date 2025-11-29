export {
  PRIMARY_GOAL,
  TIKTOK_STYLE_HOOKS_EXAMPLES,
  VIDEO_TYPES_REGISTRY,
} from "@core/domain/agents/constants";

// Re-export all agent-related types and constants
export type {
  VideoGenErrorOutput,
  VideoGenOutput,
  VideoGenRunContext as VideoGenRuntimeContext,
  VideoGenSuccessOutput,
} from "@core/domain/agents/context";
export {
  GOOD_VEO31_PROMPT_EXAMPLES,
  IMAGE_PROMPT_GUIDE_GENERAL,
  NANO_BANANA_GOOD_PROMPT_EXAMPLES,
  StaticPrompts,
} from "@core/domain/agents/prompts";
export { VideoGenAgent } from "@core/domain/agents/video-gen-agent";
