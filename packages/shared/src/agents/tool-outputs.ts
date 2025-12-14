import z from "zod";

const ToolName = z.enum([
  "image_eval",
  "echo",
  "nano_banana",
  "veo31_text_to_video",
  "veo31_image_to_video",
  "veo31_reference_images_to_video",
  "veo31_unified",
  "veo31_video_extension",
  "sora2_storyboard_generate",
  "tmp_fs",
  "virtual_shell",
  "run_ffmpeg",
]);

type ToolNameType = z.infer<typeof ToolName>;

function makeToolOutput<const T extends ToolNameType, S extends z.ZodTypeAny>(
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

const Veo31BaseVideoOutput = z.object({
  videoUrl: z.string().url(),
  outputPath: z.string(),
  durationMs: z.number().optional(),
});

const Veo31PromptVideoOutput = Veo31BaseVideoOutput.extend({
  prompt: z.string(),
});

export const Veo31TextToVideoToolOutput = makeToolOutput(
  "veo31_text_to_video",
  Veo31PromptVideoOutput,
);

export const Veo31ImageToVideoToolOutput = makeToolOutput(
  "veo31_image_to_video",
  Veo31PromptVideoOutput.extend({
    inputImagePath: z.string(),
    inputLastFramePath: z.string().nullable().optional(),
  }),
);

export const Veo31ReferenceImagesToVideoToolOutput = makeToolOutput(
  "veo31_reference_images_to_video",
  Veo31PromptVideoOutput.extend({
    referenceImagePaths: z.array(z.string()).min(1),
  }),
);

export const Veo31UnifiedToolOutput = makeToolOutput(
  "veo31_unified",
  z.object({
    videoUrl: z.string().url(),
    outputPath: z.string(),
  }),
);

export const Veo31VideoExtensionToolOutput = makeToolOutput(
  "veo31_video_extension",
  Veo31PromptVideoOutput.extend({
    originalTaskId: z.string(),
  }),
);

export const SoraStoryboardToolOutput = makeToolOutput(
  "sora2_storyboard_generate",
  z.object({
    videoUrl: z.string().url(),
    outputPath: z.string(),
  }),
);

const TmpFsListOutput = z.object({
  action: z.literal("list"),
  path: z.string(),
  entries: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["file", "directory", "other"]),
      size: z.number().nullable(),
    }),
  ),
});

const TmpFsReadOutput = z.object({
  action: z.literal("read"),
  path: z.string(),
  encoding: z.enum(["utf8", "base64"]),
  content: z.string(),
  byteLength: z.number(),
});

const TmpFsWriteOutput = z.object({
  action: z.literal("write"),
  path: z.string(),
  bytesWritten: z.number(),
});

const TmpFsDeleteOutput = z.object({
  action: z.literal("delete"),
  path: z.string(),
});

const TmpFsStatOutput = z.object({
  action: z.literal("stat"),
  path: z.string(),
  size: z.number(),
  isFile: z.boolean(),
  isDirectory: z.boolean(),
  modifiedAt: z.string(),
});

export const TmpFsToolOutput = makeToolOutput(
  "tmp_fs",
  z.union([
    TmpFsListOutput,
    TmpFsReadOutput,
    TmpFsWriteOutput,
    TmpFsDeleteOutput,
    TmpFsStatOutput,
  ]),
);

const VirtualShellEntrySchema = z.object({
  name: z.string(),
  type: z.enum(["file", "directory", "other"]),
  size: z.number().nullable(),
});

const VirtualShellLsOutput = z.object({
  command: z.literal("ls"),
  path: z.string(),
  entries: z.array(VirtualShellEntrySchema),
});

const VirtualShellCatOutput = z.object({
  command: z.literal("cat"),
  path: z.string(),
  encoding: z.enum(["utf8", "base64"]),
  content: z.string(),
  byteLength: z.number(),
});

const VirtualShellWriteOutput = z.object({
  command: z.literal("write"),
  path: z.string(),
  bytesWritten: z.number(),
  append: z.boolean(),
  encoding: z.enum(["utf8", "base64"]),
});

const VirtualShellRmOutput = z.object({
  command: z.literal("rm"),
  path: z.string(),
  recursive: z.boolean(),
});

const VirtualShellMkdirOutput = z.object({
  command: z.literal("mkdir"),
  path: z.string(),
  recursive: z.boolean(),
});

const VirtualShellStatOutput = z.object({
  command: z.literal("stat"),
  path: z.string(),
  size: z.number(),
  isFile: z.boolean(),
  isDirectory: z.boolean(),
  modifiedAt: z.string(),
});

const VirtualShellPwdOutput = z.object({
  command: z.literal("pwd"),
  cwd: z.string(),
});

export const VirtualShellToolOutput = makeToolOutput(
  "virtual_shell",
  z.union([
    VirtualShellLsOutput,
    VirtualShellCatOutput,
    VirtualShellWriteOutput,
    VirtualShellRmOutput,
    VirtualShellMkdirOutput,
    VirtualShellStatOutput,
    VirtualShellPwdOutput,
  ]),
);

export const EchoToolOutput = makeToolOutput(
  "echo",
  z.object({ message: z.string() }),
);

export const RunFfmpegToolOutput = makeToolOutput(
  "run_ffmpeg",
  z.object({
    output_url: z.string().url(),
    key: z.string().optional(),
    r2_url: z.string().url().optional(), // proto field name
    r2_key: z.string().optional(),
    filename: z.string().optional(),
    content_type: z.string().optional(),
  }),
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
  }),
);

export type NanoBananaToolOutput = z.infer<typeof NanoBananaToolOutput>;

// NOTE: keep this in sync with all tool outputs above
export const ToolOutputs = z.union([
  Veo31TextToVideoToolOutput,
  Veo31ImageToVideoToolOutput,
  Veo31ReferenceImagesToVideoToolOutput,
  Veo31VideoExtensionToolOutput,
  Veo31UnifiedToolOutput,
  SoraStoryboardToolOutput,
  TmpFsToolOutput,
  VirtualShellToolOutput,
  ImageEvalToolOutput,
  EchoToolOutput,
  NanoBananaToolOutput,
  RunFfmpegToolOutput,
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
