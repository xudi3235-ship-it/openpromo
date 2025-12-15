import { tool } from "@openai/agents";
import { z } from "zod";
import type { VideoGenAgentContext } from "../context";

const params = z.object({
  message: z.string(),
});

export const echoTool = tool<VideoGenAgentContext>({
  name: "echo",
  description: "Echoes back the input message.",
  parameters: params,
  async execute(args) {
    const { message } = params.parse(args);
    return {
      status: "success" as const,
      message,
    };
  },
});
