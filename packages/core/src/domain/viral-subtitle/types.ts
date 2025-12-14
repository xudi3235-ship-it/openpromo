/**
 * Types for viral subtitle generation
 */

/** Word timing data from transcription */
export interface WordTiming {
  word: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
}

/** Rendering mode for subtitle styles */
export type RenderingMode = "single_word" | "multi_word";

/** Available subtitle style presets */
export type SubtitleStyleName = "hormozi" | "aesthetic" | "banger";

/** Configuration for a subtitle style */
export interface SubtitleStyleConfig {
  name: SubtitleStyleName;
  renderingMode: RenderingMode;
  /** Font name (must be available in container) */
  fontname: string;
  /** Font size in pixels */
  fontsize: number;
  /** Primary/highlight color in BGR hex format (e.g., "&H00FFFF00" for cyan) */
  primaryColor: string;
  /** Secondary/base text color in BGR hex format */
  secondaryColor: string;
  /** Outline color in BGR hex format */
  outlineColor: string;
  /** Background/shadow color in BGR hex format */
  backColor: string;
  /** Whether text is bold */
  bold: boolean;
  /** Border style: 1=outline with shadow, 3=opaque box */
  borderStyle: 1 | 3;
  /** Outline thickness */
  outline: number;
  /** Shadow depth */
  shadow: number;
  /** ASS alignment: 2=bottom-center, 5=center */
  alignment: number;
  /** Whether to uppercase all text */
  uppercase: boolean;
  /** Words per line for multi_word mode */
  wordsPerLine?: number;
}
