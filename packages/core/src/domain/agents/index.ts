/**
 * Video Generation Agent exports
 * Ported from Python: src/openai_agent/
 */

// Constants
export {
  PRIMARY_GOAL,
  TIKTOK_STYLE_HOOKS_EXAMPLES,
  VIDEO_TYPES_REGISTRY,
} from "./constants";

// Prompts
export {
  GOOD_VEO31_PROMPT_EXAMPLES,
  IMAGE_PROMPT_GUIDE_GENERAL,
  NANO_BANANA_GOOD_PROMPT_EXAMPLES,
  StaticPrompts,
} from "./prompts";
// Tools
export { createShellTool, VideoGenShell, videoGenShellTool } from "./tools";
// Agent
export { VideoGenAgent } from "./video-gen-agent";
