/**
 * Viral subtitle generation module
 *
 * Generates ASS subtitle files with TikTok/YouTube Shorts style captions
 * that can be burned into videos using ffmpeg.
 *
 * @example
 * ```ts
 * import { generateAss } from "./domain/viral-subtitle";
 *
 * const words = [
 *   { word: "Stop", start: 0.5, end: 0.9 },
 *   { word: "scrolling", start: 0.9, end: 1.5 },
 *   { word: "right", start: 1.5, end: 1.8 },
 *   { word: "now!", start: 1.8, end: 2.3 },
 * ];
 *
 * const assContent = generateAss(words, "hormozi");
 * // Use with ContainerBackend.burnSubtitle({ videoUrl, assContent })
 * ```
 */

export { generateAss } from "./ass-generator";
export { getSubtitleStyle, SUBTITLE_STYLES } from "./styles";
export type {
  RenderingMode,
  SubtitleStyleConfig,
  SubtitleStyleName,
  WordTiming,
} from "./types";
