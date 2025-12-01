import z from "zod";

const ToolName = z.enum([
  "image_gen",
  "video_gen",
  "image_eval",
  "echo",
  "nano_banana",
]);

type ToolNameType = z.infer<typeof ToolName>;

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

export const ImageGenToolOutput = makeToolOutput(
  "image_gen",
  z.object({ imageUrls: z.array(z.string().url()) }),
);

export const VideoGenToolOutput = makeToolOutput(
  "video_gen",
  z.object({ videoUrl: z.string().url() }),
);

export const EchoToolOutput = makeToolOutput(
  "echo",
  z.object({ message: z.string() }),
);

export const ImageEvalToolOutput = makeToolOutput(
  "image_eval",
  z.object({
    approved: z.boolean().describe("Whether the images/prompts are approved"),
    feedback: z
      .string()
      .describe("Constructive feedback on improvements, concise"),
  }),
);

export const NanoBananaToolOutput = makeToolOutput(
  "nano_banana",
  z.object({
    imageUrl: z.string().url(),
    outputPath: z.string(),
    prompt: z.string(),
  }),
);

export const ToolOutputs = z.union([
  ImageGenToolOutput,
  VideoGenToolOutput,
  ImageEvalToolOutput,
  EchoToolOutput,
  NanoBananaToolOutput,
]);

export type ToolOutputs = z.infer<typeof ToolOutputs>;

export function maybeParseToolOutput(raw: string): ToolOutputs | null {
  const parsed = ToolOutputs.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : null;
}

type ToolSpecificOutputsInferred = z.infer<typeof ToolOutputs>;

type ToolSuccessMapAuto = {
  [M in ToolSpecificOutputsInferred as M extends { tool: infer K }
    ? K extends ToolNameType
      ? K & string
      : never
    : never]: M extends { status: "success" } ? M["output"] : never;
};

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
  const parsedOutput: ToolOutputs | null =
    typeof output === "string" ? maybeParseToolOutput(output) : output;

  if (!parsedOutput) {
    handlers.onError?.("Failed to parse tool output as ToolOutputs");
    return;
  }

  if (parsedOutput.tool !== toolName) return;

  function isSuccessFor<U extends ToolNameType>(
    candidate: ToolOutputs,
    name: U,
  ): candidate is Extract<
    ToolSpecificOutputsInferred,
    { tool: U; status: "success" }
  > {
    return candidate.status === "success" && candidate.tool === name;
  }

  if (isSuccessFor(parsedOutput, toolName)) {
    handlers.onSuccess(parsedOutput.output as SuccessFor<T>);
    return;
  }

  if (parsedOutput.status === "error") {
    handlers.onError?.(parsedOutput.error);
    return;
  }

  handlers.onError?.("Unknown tool output shape");
}

export type { ToolNameType };
