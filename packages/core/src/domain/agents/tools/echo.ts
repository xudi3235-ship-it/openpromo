import { z } from "zod";
import type { VideoGenAgentContext } from "../context";
import { toolBuilder } from "../tool-builder";

// Echo tool schema
const EchoParams = z.object({
  message: z.string(),
});

// testing our tool builder
export const echoTool = toolBuilder<
  "echo",
  typeof EchoParams,
  VideoGenAgentContext
>({
  name: "echo",
  description: "Echoes back the input message.",
  parameters: EchoParams,
  async execute(params) {
    // Always return success output for echo
    return {
      status: "success",
      tool: "echo",
      output: {
        message: params.message,
      },
    };
  },
});
