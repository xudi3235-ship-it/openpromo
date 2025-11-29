/**
 * Runtime context for video generation agent.
 * Ported from Python: src/openai_agent/context.py
 */

export interface VideoGenRunContext {
  product: string;
  business: string;
  avatarReferenceImageUrl?: string | null;
}

/**
 * Output types for video generation agent.
 * Ported from Python: src/openai_agent/agents/main_agent.py
 */
export interface VideoGenSuccessOutput {
  localVideoPath: string;
  videoUrl: string;
  summary: string;
}

export interface VideoGenErrorOutput {
  errorMessage: string;
  errorType: string;
}

export type VideoGenOutput =
  | { status: "success"; data: VideoGenSuccessOutput }
  | { status: "error"; data: VideoGenErrorOutput };
