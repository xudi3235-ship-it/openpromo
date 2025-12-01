import z from "zod";

/**
 * defines structued output for our videogen agent
 *
 * agent is staged. we have multiple steps and pipelines. For each step, we'd like to define the outptut shapes here
 */
export const AgentOutput = z.object({
  finalVideoUrl: z.string().url().optional(),
});

export type AgentOutput = z.infer<typeof AgentOutput>;

// helpers for standardizing tool output
const ToolName = z.enum([
  "image_gen",
  "video_gen",
  "image_eval",
  "echo",
  "nano_banana",
]);

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

// image evaluation output (matches evaluate-image tool's schema)
export const ImageEvalToolOutput = makeToolOutput(
  "image_eval",
  z.object({
    approved: z.boolean().describe("Whether the images/prompts are approved"),
    feedback: z
      .string()
      .describe("Constructive feedback on improvements, concise"),
  }),
);

// nano-banana tool output
export const NanoBananaToolOutput = makeToolOutput(
  "nano_banana",
  z.object({
    imageUrl: z.string().url(),
    outputPath: z.string(),
    prompt: z.string(),
  }),
);

// all tool outputs
// Specific tool outputs (exclude the generic base) — used for deriving strict TS types
export const ToolOutputs = z.union([
  ImageGenToolOutput,
  VideoGenToolOutput,
  ImageEvalToolOutput,
  EchoToolOutput,
  NanoBananaToolOutput,
]);

// Strict compile-time type: only the specific, known tool outputs (no `unknown`)
export type ToolOutputs = z.infer<typeof ToolOutputs>;

// helpers to parse the string and maybe map to tool outputs
export function maybeParseToolOutput(raw: string): ToolOutputs | null {
  const parsed = ToolOutputs.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : null;
}

// helper to handle parsed tool output with callbacks
type ToolNameType = z.infer<typeof ToolName>;

// Derive a mapping from tool name -> success output automatically from the ToolOutputs union
// Use only the specific outputs for type-level inference to avoid the generic fallback
type ToolSpecificOutputsInferred = z.infer<typeof ToolOutputs>;

// Only include union members whose `tool` is a specific ToolName literal.
// This prevents the generic `ToolOutputBase` (which uses a broader `tool` type)
// from widening every key to `unknown`.
type ToolSuccessMapAuto = {
  [M in ToolSpecificOutputsInferred as M extends { tool: infer K }
    ? K extends ToolNameType
      ? K & string
      : never
    : never]: M extends { status: "success" } ? M["output"] : never;
};

// If a tool name is not present in the auto map, this is a compile-time error (never).
type SuccessFor<T extends ToolNameType> = T extends keyof ToolSuccessMapAuto
  ? ToolSuccessMapAuto[T]
  : never;

export function onToolOutput<T extends ToolNameType>(
  output: ToolOutputs | string,
  toolName: T,
  handlers: {
    onSuccess: (output: SuccessFor<T>) => void;
    onError?: (error: string) => void;
  },
): void {
  // parse if needed
  const parsedOutput: ToolOutputs | null =
    typeof output === "string" ? maybeParseToolOutput(output) : output;

  if (!parsedOutput) {
    handlers.onError?.("Failed to parse tool output as ToolOutputs");
    return;
  }
  // Ensure the output refers to the requested tool
  if (parsedOutput.tool !== toolName) return;
  // Narrow to the success variant for the requested tool using a type guard so
  // we avoid any `unknown` casts.
  function isSuccessFor<U extends ToolNameType>(
    p: ToolOutputs,
    name: U,
  ): p is Extract<ToolSpecificOutputsInferred, { tool: U; status: "success" }> {
    return p.status === "success" && p.tool === name;
  }

  if (isSuccessFor(parsedOutput, toolName)) {
    handlers.onSuccess(parsedOutput.output as SuccessFor<T>);
    return;
  }

  // error variant (status !== 'success') — schema guarantees `error` exists
  if (parsedOutput.status === "error") {
    handlers.onError?.(parsedOutput.error);
    return;
  }

  handlers.onError?.("Unknown tool output shape");
}
