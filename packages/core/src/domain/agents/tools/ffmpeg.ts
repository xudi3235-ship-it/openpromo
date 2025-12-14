/**
 * FFmpeg RPC tool for agents.
 * Calls the container Connect RPC `RunFfmpeg` via the ContainerBackend DO.
 */

import { tool } from "@openai/agents";
import { z } from "zod";
import { Binding } from "../../../helpers/api-env";
import type { VideoGenAgentContext } from "../context";

const params = z.object({
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

const FFMPEG_TOOL_DESCRIPTION = `Run an ffmpeg command on the server.

IMPORTANT NOTES:
- "exit status 234" error usually means video formats are incompatible
- For concatenation, ensure all videos have the same resolution, framerate, and codec
- If concatenation fails, try re-encoding videos first or use the safe concat command below
- Always test with shorter videos first to identify format issues early

INPUTS:
- input_urls: Ordered list of media URLs. Each URL is downloaded and mapped to a placeholder by index:
    input_urls[0] → {in0}
    input_urls[1] → {in1}
    ...
- command: Array of ffmpeg argv tokens. Use {in0}, {in1}, ... for inputs. {out} is optional; if omitted, the server appends the output path automatically. The server prepends "ffmpeg -y".
- output_filename: Optional filename for the result (e.g. "merged.mp4").

COMMON EXAMPLES:

1) Scale to 720p (maintains aspect ratio):
   input_urls: ["<video_url>"]
   command: ["-i", "{in0}", "-vf", "scale=-2:720", "-c:a", "copy", "{out}"]

2) Trim first 10 seconds:
   input_urls: ["<video_url>"]
   command: ["-i", "{in0}", "-t", "10", "-c", "copy", "{out}"]

3) Concat two videos (SAFE - re-encodes for compatibility):
   input_urls: ["<video1_url>", "<video2_url>"]
   command: ["-i", "{in0}", "-i", "{in1}", "-filter_complex", "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]", "-map", "[outv]", "-map", "[outa]", "-c:v", "libx264", "-preset", "fast", "-c:a", "aac", "{out}"]

4) Concat multiple videos (SAFE approach):
   input_urls: ["<video1_url>", "<video2_url>", "<video3_url>"]
   command: ["-i", "{in0}", "-i", "{in1}", "-i", "{in2}", "-filter_complex", "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]", "-map", "[outv]", "-map", "[outa]", "-c:v", "libx264", "-preset", "fast", "-c:a", "aac", "{out}"]

TROUBLESHOOTING:
- If concat fails with exit status 234, add "-c:v libx264 -preset fast -c:a aac" to re-encode
- Check that all videos are accessible (try downloading them first)
- Use shorter test clips to identify the problematic video

Returns: { output_url: "<presigned_r2_url>" } on success.
`;

export const ffmpegTool = tool<VideoGenAgentContext>({
  name: "run_ffmpeg",
  description: FFMPEG_TOOL_DESCRIPTION,
  parameters: params,
  isEnabled(args) {
    const context = args.runContext.context as VideoGenAgentContext;
    return context.stage === "video_gen";
  },
  async execute(args) {
    const parsed = params.parse(args);
    try {
      const stub = Binding.use().ContainerBackend.getByName("default");

      console.log(
        `[run_ffmpeg] Processing ${parsed.input_urls.length} input(s)`,
      );
      console.log(`[run_ffmpeg] Command: ffmpeg ${parsed.command.join(" ")}`);

      const resp = await stub.runFfmpeg({
        inputUrls: parsed.input_urls,
        command: parsed.command,
        outputFilename:
          parsed.output_filename ?? `/tmp/output_${Date.now()}.mp4`,
      });

      return {
        status: "success" as const,
        output_url: resp.r2Url,
        key: resp.r2Key,
        content_type: resp.contentType,
        filename: resp.filename,
      };
    } catch (error) {
      console.error("[run_ffmpeg] Error:", error);

      const errorMsg = error instanceof Error ? error.message : String(error);

      // Provide helpful error messages for common issues
      if (errorMsg.includes("exit status 234")) {
        return {
          status: "error" as const,
          error: `Video processing failed (exit status 234). This usually means the input videos have incompatible formats (different resolutions, framerates, or codecs).

SOLUTION: Re-encode the videos to a common format first. Try adding these flags to your command:
- "-c:v", "libx264", "-preset", "fast"  // for video
- "-c:a", "aac"                         // for audio

Example safe concat command:
["-i", "{in0}", "-i", "{in1}", "-filter_complex", "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]", "-map", "[outv]", "-map", "[outa]", "-c:v", "libx264", "-preset", "fast", "-c:a", "aac", "{out}"]

Original error: ${errorMsg}`,
        };
      }

      if (
        errorMsg.includes("Invalid argument") ||
        errorMsg.includes("No such file")
      ) {
        return {
          status: "error" as const,
          error: `Invalid ffmpeg command or inaccessible input files. Check:
1. All input URLs are valid and accessible
2. All placeholders ({in0}, {in1}, etc.) are correct
3. No missing input files

Original error: ${errorMsg}`,
        };
      }

      return {
        status: "error" as const,
        error: `ffmpeg failed: ${errorMsg}`,
      };
    }
  },
});
