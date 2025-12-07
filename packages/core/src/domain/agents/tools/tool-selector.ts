import { type RunContext, tool } from "@openai/agents";
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";

const toolParams = z.object({
  docs: z
    .enum(["image_gen", "video_gen"])
    .array()
    .describe("Which docs to read"),
});

type ToolParams = z.infer<typeof toolParams>;

// wip, not ready yet.
export const toolSelector = tool({
  name: "tool_selector",
  description: `dynamically gives you context about docs, tools, usage, so you can pick the tools for the primary task you're executing on. Helpful since many tools might overload the context.
    e.g. for image gen flow, you only need to load image gen tools, docs, etc.
    for video gen, similarly, as we have different video gen flows.
    `,
  parameters: toolParams,
  async execute(
    params: ToolParams,
    _runContext?: RunContext<VideoGenAgentContext>,
  ) {
    console.log(`[toolSelector] Selected docs: ${params}`);
  },
});
