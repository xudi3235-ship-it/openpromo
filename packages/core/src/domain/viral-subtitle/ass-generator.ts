/**
 * ASS (Advanced SubStation Alpha) subtitle file generator
 * Generates styled karaoke-style subtitles for viral video content
 */

import { getSubtitleStyle } from "./styles";
import type {
  SubtitleStyleConfig,
  SubtitleStyleName,
  WordTiming,
} from "./types";

/** Convert seconds to ASS timestamp format (H:MM:SS.cc) */
function secToAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds - Math.floor(seconds)) * 100);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

/** Build the ASS Style line from config */
function buildStyleLine(style: SubtitleStyleConfig): string {
  const bold = style.bold ? -1 : 0;
  // Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,
  //         Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle,
  //         BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
  return `Style: ${style.name},${style.fontname},${style.fontsize},${style.primaryColor},${style.secondaryColor},${style.outlineColor},${style.backColor},${bold},0,0,0,100,100,0,0,${style.borderStyle},${style.outline},${style.shadow},${style.alignment},10,10,150,1`;
}

/** Generate ASS header with style definitions */
function generateAssHeader(style: SubtitleStyleConfig): string {
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${buildStyleLine(style)}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

/**
 * Generate single_word mode dialogue events
 * Each word appears individually at center, then disappears
 */
function generateSingleWordEvents(
  words: WordTiming[],
  style: SubtitleStyleConfig,
): string {
  let events = "";

  for (const word of words) {
    const text = style.uppercase ? word.word.toUpperCase() : word.word;
    const start = secToAssTime(word.start);
    const end = secToAssTime(word.end);
    events += `Dialogue: 0,${start},${end},${style.name},,0,0,0,,${text}\n`;
  }

  return events;
}

/**
 * Group words into chunks for multi_word mode
 */
function chunkWords(words: WordTiming[], wordsPerLine: number): WordTiming[][] {
  const chunks: WordTiming[][] = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    chunks.push(words.slice(i, i + wordsPerLine));
  }
  return chunks;
}

/**
 * Generate multi_word mode dialogue events
 * Words are grouped, with karaoke highlight on current word
 */
function generateMultiWordEvents(
  words: WordTiming[],
  style: SubtitleStyleConfig,
): string {
  const wordsPerLine = style.wordsPerLine ?? 3;
  const chunks = chunkWords(words, wordsPerLine);
  let events = "";

  for (const chunk of chunks) {
    if (chunk.length === 0) continue;

    const chunkStart = chunk[0].start;
    const chunkEnd = chunk[chunk.length - 1].end;
    const start = secToAssTime(chunkStart);
    const end = secToAssTime(chunkEnd);

    // Build karaoke text with \k tags for word-by-word highlighting
    let text = "";
    for (const word of chunk) {
      const duration = word.end - word.start;
      const durationCs = Math.floor(duration * 100);
      const wordText = style.uppercase ? word.word.toUpperCase() : word.word;
      text += `{\\k${durationCs}}${wordText} `;
    }

    events += `Dialogue: 0,${start},${end},${style.name},,0,0,0,,${text.trim()}\n`;
  }

  return events;
}

/**
 * Generate complete ASS subtitle file content
 *
 * @param words - Array of word timing data from transcription
 * @param styleName - Name of the subtitle style preset to use
 * @returns Complete ASS file content as string
 */
export function generateAss(
  words: WordTiming[],
  styleName: SubtitleStyleName,
): string {
  if (words.length === 0) {
    throw new Error("No words provided for subtitle generation");
  }

  const style = getSubtitleStyle(styleName);
  const header = generateAssHeader(style);

  let events: string;
  switch (style.renderingMode) {
    case "single_word":
      events = generateSingleWordEvents(words, style);
      break;
    case "multi_word":
      events = generateMultiWordEvents(words, style);
      break;
    default:
      throw new Error(`Unknown rendering mode: ${style.renderingMode}`);
  }

  return header + events;
}
