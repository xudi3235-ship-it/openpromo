import z from "zod";

/**
 * defines structued output for our videogen agent
 */
export const AgentOutput = z.object({
  finalVideoUrl: z.string().url().optional(),
});

export type AgentOutput = z.infer<typeof AgentOutput>;

// helpers for standardizing tool output
const ToolName = z.enum(["image_gen", "video_gen", "image_eval", "echo"]);

/**
 * Helper to create a discriminated tool output schema for a given tool name
 * and output schema. Returns a union of success/error discriminated by `status`.
 */
function makeToolOutput<const T extends string, S extends z.ZodTypeAny>(
  toolName: T,
  outputSchema: S,
) {
  const success = z.object({
    status: z.literal("success"),
    tool: z.literal(toolName),
    output: outputSchema,
  });

  const error = z.object({
    status: z.literal("error"),
    tool: z.literal(toolName),
    error: z.string(),
  });

  return z.discriminatedUnion("status", [success, error]);
}

// keep a generic fallback for tools that don't have a specific output schema
export const ToolOutputBase = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("success"),
    tool: ToolName,
    output: z.unknown(), // override in specific tool outputs
  }),
  z.object({
    status: z.literal("error"),
    tool: ToolName,
    error: z.string(),
  }),
]);

// image gen output
export const ImageGenToolOutput = makeToolOutput(
  "image_gen",
  z.object({ imageUrls: z.array(z.string().url()) }),
);

// video gen output
export const VideoGenToolOutput = makeToolOutput(
  "video_gen",
  z.object({ videoUrl: z.string().url() }),
);

// echo tool output
export const EchoToolOutput = makeToolOutput(
  "echo",
  z.object({ message: z.string() }),
);

// all tool outputs
export const ToolOutputs = z.union([
  ImageGenToolOutput,
  VideoGenToolOutput,
  EchoToolOutput,
  ToolOutputBase,
]);

export type ToolOutputs = z.infer<typeof ToolOutputs>;
