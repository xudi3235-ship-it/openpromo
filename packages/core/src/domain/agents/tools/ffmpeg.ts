/**
 * FFmpeg RPC tool for agents.
 * Calls the container Connect RPC `RunFfmpeg` via the ContainerBackend DO.
 */

import { z } from "zod";
import { Binding } from "../../../helpers/api-env";
import type { VideoGenAgentContext } from "../context";
import { toolBuilder, toolSuccess } from "../tool-builder";

// mirrors the RunFfmpegRequest schema
const FfmpegParamsSchema = z.object({
  input_urls: z
    .array(z.string())
    .describe(
      "Ordered list of input media URLs. The server downloads them and maps them to placeholders by index: input_urls[0] → {in0}, input_urls[1] → {in1}, etc.",
    ),
  command: z
    .array(z.string())
    .describe(
      "FFmpeg argv tokens (one per array element). Use placeholders {in0}, {in1}, ... for inputs and {out} for output path. The server prepends 'ffmpeg -y'.",
    ),
  output_filename: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Optional filename for the output artifact (e.g. 'merged.mp4'). If omitted, a temp name is used.",
    ),
});

type FfmpegParams = z.infer<typeof FfmpegParamsSchema>;

const FFMPEG_TOOL_DESCRIPTION = `Run an ffmpeg command on the server.

INPUTS:
- input_urls: Ordered list of media URLs. Each URL is downloaded and mapped to a placeholder by index:
    input_urls[0] → {in0}
    input_urls[1] → {in1}
    ...
- command: Array of ffmpeg argv tokens. Use {in0}, {in1}, ... for inputs and {out} for the output path. The server automatically prepends "ffmpeg -y".
- output_filename: Optional filename for the result (e.g. "merged.mp4").

COMMON EXAMPLES:

1) Scale to 720p:
   input_urls: ["<video_url>"]
   command: ["-i", "{in0}", "-vf", "scale=-2:720", "{out}"]

2) Trim first 10 seconds:
   input_urls: ["<video_url>"]
   command: ["-i", "{in0}", "-t", "10", "-c", "copy", "{out}"]

3) Concat two videos:
   input_urls: ["<video1_url>", "<video2_url>"]
   command: ["-i", "{in0}", "-i", "{in1}", "-filter_complex", "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]", "-map", "[outv]", "-map", "[outa]", "{out}"]

   ...
Returns: { output_url: "<presigned_r2_url>" } on success.
`;

export const ffmpegTool = toolBuilder<
  "run_ffmpeg",
  typeof FfmpegParamsSchema,
  VideoGenAgentContext
>({
  name: "run_ffmpeg",
  description: FFMPEG_TOOL_DESCRIPTION,
  parameters: FfmpegParamsSchema,
  async execute(params: FfmpegParams) {
    const bindings = Binding.use();
    const stub = bindings.ContainerBackend.getByName("default");

    const resp = await stub.runFfmpeg({
      inputUrls: params.input_urls,
      command: params.command,
      outputFilename: params.output_filename ?? undefined,
    });

    return toolSuccess("run_ffmpeg", {
      output_url: resp.r2Url,
      key: resp.r2Key,
      content_type: resp.contentType,
      filename: resp.filename,
    });
  },
});
