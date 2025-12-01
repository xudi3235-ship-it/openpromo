/**
 * FFmpeg RPC tool for agents.
 * Calls the backend Connect RPC `RunFfmpeg` method via the client in `src/rpc`.
 */

import { z } from "zod";
import { videoClient } from "../../../rpc";
import type { VideoGenAgentContext } from "../context";
import { toolBuilder, toolError, toolSuccess } from "../tool-builder";

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

/**
 * FFmpeg tool description with examples for common operations.
 *
 * IMPORTANT: input_urls order determines placeholder mapping:
 *   input_urls[0] → {in0}
 *   input_urls[1] → {in1}
 *   ...
 *
 * The server downloads each URL, substitutes placeholders, runs ffmpeg, uploads the result to R2, and returns a presigned URL.
 *
 * ═══════════════════════════════════════════════════════════════════
 * EXAMPLES
 * ═══════════════════════════════════════════════════════════════════
 *
 * 1) SCALE a video to 720p:
 *    input_urls: ["https://example.com/video.mp4"]
 *    command: ["-i", "{in0}", "-vf", "scale=-2:720", "{out}"]
 *
 * 2) TRIM a video (first 10 seconds):
 *    input_urls: ["https://example.com/video.mp4"]
 *    command: ["-i", "{in0}", "-t", "10", "-c", "copy", "{out}"]
 *
 * 3) CONCAT two videos (same codec, re-encode):
 *    input_urls: ["https://example.com/a.mp4", "https://example.com/b.mp4"]
 *    command: [
 *      "-i", "{in0}", "-i", "{in1}",
 *      "-filter_complex", "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[outv][outa]",
 *      "-map", "[outv]", "-map", "[outa]",
 *      "{out}"
 *    ]
 *
 * 4) OVERLAY an image watermark on a video:
 *    input_urls: ["https://example.com/video.mp4", "https://example.com/logo.png"]
 *    command: [
 *      "-i", "{in0}", "-i", "{in1}",
 *      "-filter_complex", "overlay=W-w-10:H-h-10",
 *      "{out}"
 *    ]
 *
 * 5) EXTRACT audio from video:
 *    input_urls: ["https://example.com/video.mp4"]
 *    command: ["-i", "{in0}", "-vn", "-acodec", "libmp3lame", "{out}"]
 *    output_filename: "audio.mp3"
 *
 * 6) ADD audio track to a silent video:
 *    input_urls: ["https://example.com/video.mp4", "https://example.com/audio.mp3"]
 *    command: [
 *      "-i", "{in0}", "-i", "{in1}",
 *      "-c:v", "copy", "-c:a", "aac", "-shortest",
 *      "{out}"
 *    ]
 *
 * 7) CHANGE aspect ratio (pad to 9:16 vertical):
 *    input_urls: ["https://example.com/video.mp4"]
 *    command: [
 *      "-i", "{in0}",
 *      "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
 *      "{out}"
 *    ]
 *
 * ═══════════════════════════════════════════════════════════════════
 */
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

4) Overlay watermark:
   input_urls: ["<video_url>", "<logo_url>"]
   command: ["-i", "{in0}", "-i", "{in1}", "-filter_complex", "overlay=W-w-10:H-h-10", "{out}"]

5) Extract audio:
   input_urls: ["<video_url>"]
   command: ["-i", "{in0}", "-vn", "-acodec", "libmp3lame", "{out}"]
   output_filename: "audio.mp3"

6) Add audio to video:
   input_urls: ["<video_url>", "<audio_url>"]
   command: ["-i", "{in0}", "-i", "{in1}", "-c:v", "copy", "-c:a", "aac", "-shortest", "{out}"]

7) Pad to 9:16 vertical:
   input_urls: ["<video_url>"]
   command: ["-i", "{in0}", "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2", "{out}"]

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
    const resp = await videoClient.runFfmpeg(params);
    if (!resp) return toolError("run_ffmpeg", "No response from ffmpeg RPC");
    if (!resp.success)
      return toolError("run_ffmpeg", resp.error || "ffmpeg failed");
    return toolSuccess("run_ffmpeg", { output_url: resp.outputUrl });
  },
});
