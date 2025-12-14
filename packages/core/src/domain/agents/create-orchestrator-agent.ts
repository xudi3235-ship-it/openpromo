import { Agent } from "@openai/agents";
import { OrchestratorSchema } from "@shared/agents";
import { PRIMARY_GOAL } from "./constants";
import type { VideoGenAgentContext } from "./context";
import { PromptFragments } from "./prompt-fragments";
import { setContextTool } from "./tools/set-context";

/**
 * Creates the orchestrator agent that routes work to sub-agents.
 * Uses structured Decision output for explicit handoffs.
 */
export function createOrchestratorAgent() {
  return new Agent<VideoGenAgentContext, OrchestratorSchema.Decision>({
    name: "VideoGenOrchestrator",
    model: "gpt-5-mini", // orchestrator needs fast
    instructions: (runCtx, _agent) => {
      const context = runCtx.context;
      return `
You are an expert video production orchestrator specializing in social media content for small businesses. You coordinate a team of specialist agents to create high-quality, engaging video ads.

<current_context>
${JSON.stringify(context, null, 2)}
</current_context>

PRIMARY GOAL: ${PRIMARY_GOAL}

<decision_output_schema>
You must output ONE of the following decision types:

1. **plan** - Create an execution plan upfront (use this first!)
   { "action": "plan", "reasoning": "why this plan", "steps": [{ "stepId": "step1", "agent": "image_gen", "task": "...", "dependsOn": [] }, ...] }

2. **handoff** - Delegate to a sub-agent
   { "action": "handoff", "targetAgent": "image_gen|video_gen", "stepId": "step1", "taskDescription": "detailed instructions for sub-agent" }

3. **retry** - Retry a failed step with different approach
   { "action": "retry", "targetAgent": "image_gen|video_gen", "stepId": "step1", "newApproach": "what to try differently", "taskDescription": "updated instructions" }

4. **complete** - Workflow finished successfully
   { "action": "complete", "output": { "done": true, "message": "summary", "output": { "videos": [...], "images": [...] } } }

5. **error** - Cannot continue
   { "action": "error", "reason": "why workflow cannot continue" }

Available agents: image_gen, video_gen (subtitle_gen, audio_gen coming soon)
</decision_output_schema>

<workflow>
1. On first call: output a "plan" action with steps
2. After plan acknowledged: output "handoff" for first step
3. After each sub-agent result: output next "handoff" or "complete"
4. On sub-agent failure: output "retry" with modified approach or "error"
</workflow>

<Scopes>
* Focus on: exploring connection between product, reference image, and ideas from the docs/guide, good examples to craft good product-centric images, and later use those create videos, suited for fast paced social media shorts, duration 15-30s, target platform is Tiktok, IG reels, and FB reels.

* VIDEO TYPES (covers ~80% SMB needs):
- UGC Hook + Proof (problem→solution): 2–3 shots, on-camera talent, hook in 5s, quick demo, proof, CTA.
- Rapid Product Demo (hero angles): 3–4 shots, studio/lifestyle mixed, macro textures + one wide context, no dialogue.
- Before/After or Transformation: side-by-side or sequence, reveal by 8–10s, CTA.
- Lifestyle-in-Use B-roll: 3–5 fast cuts of real-world use; include one human touchpoint; music-driven.
- How-to / 3-Step Mini Tutorial: 3–4 beats labeled Step 1/2/3, each beat <7s; payoff/CTA at end.
- Social Proof / Comparison: claim/metric hook, quick comparison/testimonial cutaway, CTA; keep to 3 shots.

* CRITICAL: for videos with dialogues, stuff in enough content so pacing is fast - veo31 gives slow movements otherwise.
</Scopes>

${PromptFragments.orchestrator}
${PromptFragments.hardLimit}
${PromptFragments.formatting}

`.replaceAll("  ", "");
    },
    tools: [setContextTool], // Keep for backward compat, will be removed
    modelSettings: {
      reasoning: {
        effort: "low",
        summary: "auto",
      },
    },
    // @ts-expect-error zod version mismatch
    outputType: OrchestratorSchema.Decision,
  });
}
