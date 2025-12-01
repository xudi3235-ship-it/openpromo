import { tool } from "@openai/agents";
import { type ToolNameType, ToolOutputs } from "./agent-types";
// zod import removed, not used

/**
 * Higher-order tool builder that wraps a tool definition and enforces standard output.
 * Automatically wraps the execute function in try/catch and returns a standard output shape.
 */
import type { z } from "zod";

type InferZodType<T extends z.ZodTypeAny> = z.infer<T>;

export type ToolResultFor<Name extends ToolNameType> = Extract<
  ToolOutputs,
  { tool: Name }
>;

export type ToolSuccessResult<Name extends ToolNameType> = Extract<
  ToolOutputs,
  { tool: Name; status: "success" }
>;

export type ToolErrorResult<Name extends ToolNameType> = Extract<
  ToolOutputs,
  { tool: Name; status: "error" }
>;

export function toolSuccess<Name extends ToolNameType>(
  toolName: Name,
  output: ToolSuccessResult<Name>["output"],
): ToolSuccessResult<Name> {
  return {
    status: "success",
    tool: toolName,
    output,
  } as ToolSuccessResult<Name>;
}

export function toolError<Name extends ToolNameType>(
  toolName: Name,
  error: string,
): ToolErrorResult<Name> {
  return {
    status: "error",
    tool: toolName,
    error,
  } as ToolErrorResult<Name>;
}

interface ToolBuilderOptions<
  Name extends ToolNameType,
  Schema extends z.ZodTypeAny,
> {
  name: Name;
  description: string;
  parameters: Schema;
  execute: (params: InferZodType<Schema>) => Promise<ToolResultFor<Name>>;
}

export function toolBuilder<
  Name extends ToolNameType,
  Schema extends z.ZodTypeAny,
>({
  name,
  description,
  parameters,
  execute,
}: ToolBuilderOptions<Name, Schema>) {
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
          return parsed.data as ToolResultFor<Name>;
        }
        return toolError(
          name,
          `Invalid tool output: ${JSON.stringify(parsed.error)}`,
        );
      } catch (error) {
        return toolError(
          name,
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}
