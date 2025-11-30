import { tool } from "@openai/agents";
import { ToolOutputs } from "./agent-types";
// zod import removed, not used

/**
 * Higher-order tool builder that wraps a tool definition and enforces standard output.
 * Automatically wraps the execute function in try/catch and returns a standard output shape.
 */
import type { z } from "zod";

type InferZodType<T extends z.ZodTypeAny> = z.infer<T>;

interface ToolBuilderOptions<Schema extends z.ZodTypeAny> {
  name: string;
  description: string;
  parameters: Schema;
  execute: (params: InferZodType<Schema>) => Promise<ToolOutputs>;
}

export function toolBuilder<Schema extends z.ZodTypeAny>({
  name,
  description,
  parameters,
  execute,
}: ToolBuilderOptions<Schema>) {
  return tool({
    name,
    description,
    parameters,
    async execute(params) {
      try {
        const parsedParams = parameters.parse(params);
        const result = await execute(parsedParams);
        // Validate and return using ToolOutputs
        const parsed = ToolOutputs.safeParse(result);
        if (parsed.success) {
          return parsed.data;
        } else {
          return {
            status: "error",
            tool: name,
            error: `Invalid tool output: ${JSON.stringify(parsed.error)}`,
          };
        }
      } catch (error) {
        return {
          status: "error",
          tool: name,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });
}
