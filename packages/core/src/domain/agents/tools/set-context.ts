import { type RunContext, tool } from "@openai/agents";
import z from "zod";
import { VideoGenAgentContext } from "../context";

const params = z.object({
  ...VideoGenAgentContext.omit({ input: true }).shape,
});

type Params = z.infer<typeof params>;

export const setContextTool = tool<VideoGenAgentContext>({
  name: "set_context",
  description:
    "update your internal context, which tracks the stages, steps, current tasks, etc.",
  parameters: params,
  // @ts-expect-error mismatch
  async execute(params: Params, ctx: RunContext<VideoGenAgentContext>) {
    console.log("set_context_tool called with params:", params);
    ctx.context = {
      ...ctx.context,
      ...params,
    };
    return { success: true, message: "Context updated" };
  },
});
