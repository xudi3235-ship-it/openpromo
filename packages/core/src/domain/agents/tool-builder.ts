import type {
  FunctionCallItem,
  RunContext,
  UnknownContext,
} from "@openai/agents";
import { tool } from "@openai/agents";

/**
 * Higher-order tool builder that wraps a tool definition and enforces standard output.
 * Automatically wraps the execute function in try/catch and returns a standard output shape.
 */
import type { z } from "zod";
import { type ToolNameType, ToolOutputs } from "./agent-types";

type InferZodType<T extends z.ZodTypeAny> = z.infer<T>;
type RawToolOptions = Parameters<typeof tool>[0];
type AdditionalToolOptions = Omit<
  RawToolOptions,
  "name" | "description" | "parameters" | "execute"
>;
type ToolExecuteDetails = { toolCall: FunctionCallItem };

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
  Context = UnknownContext,
> extends AdditionalToolOptions {
  name: Name;
  description: string;
  parameters: Schema;
  execute: (
    params: InferZodType<Schema>,
    context?: RunContext<Context>,
    details?: ToolExecuteDetails,
  ) => Promise<ToolResultFor<Name>>;
}

export function toolBuilder<
  Name extends ToolNameType,
  Schema extends z.ZodTypeAny,
  Context = UnknownContext,
>({
  name,
  description,
  parameters,
  execute,
  ...rest
}: ToolBuilderOptions<Name, Schema, Context>) {
  return tool({
    ...rest,
    name,
    description,
    parameters,
    async execute(
      params: unknown,
      context?: RunContext<Context>,
      details?: ToolExecuteDetails,
    ) {
      try {
        const parsedParams = parameters.parse(params);
        const result = await execute(parsedParams, context, details);
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
        return toolError(name, formatToolError(error));
      }
    },
  });
}

function formatToolError(error: unknown): string {
  if (error instanceof Error) {
    const parts = [error.message];
    const maybeCode = (error as { code?: unknown }).code;
    if (maybeCode !== undefined) {
      parts.push(`code=${maybeCode as string}`);
    }
    const details = (error as { details?: unknown }).details;
    if (details !== undefined) {
      parts.push(`details=${safeStringify(details)}`);
    }
    return parts.join(" | ");
  }
  return safeStringify(error);
}

function safeStringify(value: unknown): string {
  try {
    return typeof value === "string" ? value : JSON.stringify(value);
  } catch (_err) {
    return String(value);
  }
}
