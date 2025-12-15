/**
 * Viral subtitle style presets
 *
 * Color format: ASS uses BGR hex with &H prefix
 * &HAABBGGRR where AA=alpha (00=opaque, FF=transparent)
 */

import type { SubtitleStyleConfig, SubtitleStyleName } from "./types";

/**
 * "The Hormozi" style - High contrast, yellow highlight
 * Single word at center, changes each word
 * Used for high-energy, informative clips
 */
const hormoziStyle: SubtitleStyleConfig = {
  name: "hormozi",
  renderingMode: "single_word",
  fontname: "Montserrat ExtraBold",
  fontsize: 85,
  primaryColor: "&H0000FFFF", // Yellow (BGR)
  secondaryColor: "&H00FFFFFF", // White
  outlineColor: "&H00000000", // Black
  backColor: "&H80000000", // Translucent black shadow
  bold: true,
  borderStyle: 1, // Outline with shadow
  outline: 4,
  shadow: 2,
  alignment: 5, // Center
  uppercase: true,
};

/**
 * "The Aesthetic" style - Clean and modern
 * 2-4 words per line at bottom-center with karaoke highlight
 * Good for lifestyle/vlog content
 */
const aestheticStyle: SubtitleStyleConfig = {
  name: "aesthetic",
  renderingMode: "multi_word",
  fontname: "Montserrat Bold",
  fontsize: 70,
  primaryColor: "&H00FFFF00", // Cyan (BGR)
  secondaryColor: "&H00FFFFFF", // White
  outlineColor: "&H00000000", // Black
  backColor: "&H40000000", // Soft shadow
  bold: false,
  borderStyle: 1,
  outline: 1,
  shadow: 3,
  alignment: 2, // Bottom center
  uppercase: false,
  wordsPerLine: 3,
};

/**
 * "The Banger" style - Aggressive with opaque box
 * Single word at center with red highlight
 * Used for controversial or hook statements
 */
const bangerStyle: SubtitleStyleConfig = {
  name: "banger",
  renderingMode: "single_word",
  fontname: "Montserrat Black",
  fontsize: 90,
  primaryColor: "&H000000FF", // Red (BGR)
  secondaryColor: "&H00FFFFFF", // White
  outlineColor: "&H00000000", // Black
  backColor: "&H00000000", // Opaque black background
  bold: true,
  borderStyle: 3, // Opaque box
  outline: 0,
  shadow: 0,
  alignment: 5, // Center
  uppercase: true,
};

/** All available style presets */
export const SUBTITLE_STYLES: Record<SubtitleStyleName, SubtitleStyleConfig> = {
  hormozi: hormoziStyle,
  aesthetic: aestheticStyle,
  banger: bangerStyle,
};

/** Get a style config by name */
export function getSubtitleStyle(name: SubtitleStyleName): SubtitleStyleConfig {
  return SUBTITLE_STYLES[name];
}
