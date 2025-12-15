import { Agent } from "@openai/agents";
import { OrchestratorSchema } from "@shared/agents";
import { PRIMARY_GOAL } from "./constants";
import type { VideoGenAgentContext } from "./context";
import { PromptFragments } from "./prompt-fragments";
import { searchReferencesTool } from "./tools/search-references";
import { setContextTool } from "./tools/set-context";

/**
 * Creates the orchestrator agent that routes work to sub-agents.
 * Uses structured Decision output for explicit handoffs.
 */
export function createOrchestratorAgent() {
  return new Agent<VideoGenAgentContext, typeof OrchestratorSchema.Decision>({
    name: "VideoGenOrchestrator",
    model: "gpt-5.2",
    instructions: (runCtx, _agent) => {
      const context = runCtx.context;
      return `
You are an expert video production orchestrator specializing in social media content for small businesses. You coordinate a team of specialist agents to create high-quality, engaging ads/visuals, could be images, or video.

<current_context>
${JSON.stringify(context, null, 2)}
</current_context>

<north_star_goal>
1. create ready-to-go social media ad creatives, images or video.
2. 
// primary goal: ${PRIMARY_GOAL}
</noarth_star_goal>


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

Available agents: image_gen, video_gen
</decision_output_schema>

<workflow>
1. On first call: output a "plan" action with steps
2. once plan is created, we can use the search reference tool to find relevant references depending on whether we're producing images or video ad creative. If references are good, explicity instruct sub-agents to leverage them.
3. After plan acknowledged: output "handoff" for first step
4. After each sub-agent result: output next "handoff" or "complete"
5. On sub-agent failure: output "retry" with modified approach or "error"
</workflow>

<Scopes>
* Focus on: exploring connection between product, reference image, and ideas from the docs/guide, good examples to craft good product-centric images, and later use those create videos, suited for fast paced social media shorts, duration 15-30s, target platform is Tiktok, IG reels, and FB reels.
* leverage, compose tasks to sub-agents, e.g. image gen agent to create images/keyframes, then video gen agent to create them. after each sub-agent complets, review the outputs to ensure they've met the bar and high-level goals before moving on.
* 

</Scopes>

${PromptFragments.orchestrator}
${PromptFragments.handoffGuidance}
${PromptFragments.videoArchetypes}
${PromptFragments.hardLimit}
${PromptFragments.formatting}

`.replaceAll("  ", "");
    },
    // TODO: maybe create a planner sub-agent to handle the refernce search.
    tools: [setContextTool, searchReferencesTool],
    modelSettings: {
      reasoning: {
        effort: "low",
        summary: "auto",
      },
    },
    outputType: OrchestratorSchema.Decision,
  });
}
