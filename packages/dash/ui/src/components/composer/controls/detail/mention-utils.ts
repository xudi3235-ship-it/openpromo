/**
 * Utility functions for mention/hashtag textarea
 * Inspired by https://craft.mxkaske.dev/post/fancy-area
 */

/**
 * Get the current word where the caret is positioned
 */
export function getCurrentWord(
  textarea: HTMLTextAreaElement,
): { word: string; start: number; end: number } | null {
  const text = textarea.value;
  const caret = textarea.selectionStart;

  // Find word boundaries
  let start = caret;
  let end = caret;

  // Move start back to find the beginning of the word (or @ or #)
  while (start > 0 && !/\s/.test(text[start - 1])) {
    start--;
  }

  // Move end forward to find the end of the word
  while (end < text.length && !/\s/.test(text[end])) {
    end++;
  }

  const word = text.slice(start, end);
  return { word, start, end };
}

/**
 * Replace the current word at caret position with a new value
 */
export function replaceWord(
  textarea: HTMLTextAreaElement,
  newValue: string,
): void {
  const currentWord = getCurrentWord(textarea);
  if (!currentWord) return;

  const { start, end } = currentWord;

  // Use execCommand for undo support (deprecated but still works)
  textarea.focus();
  textarea.setSelectionRange(start, end);
  document.execCommand("insertText", false, `${newValue} `);
}

/**
 * Get caret coordinates for positioning dropdown
 */
export function getCaretCoordinates(textarea: HTMLTextAreaElement): {
  top: number;
  left: number;
  height: number;
} {
  // Create a mirror div with the same styles
  const div = document.createElement("div");
  const computed = window.getComputedStyle(textarea);

  // Copy all relevant styles
  const properties = [
    "boxSizing",
    "width",
    "height",
    "overflowX",
    "overflowY",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "textTransform",
    "letterSpacing",
    "whiteSpace",
    "wordWrap",
  ];

  for (const prop of properties) {
    const value = computed.getPropertyValue(prop);
    if (value) {
      div.style.setProperty(prop, value);
    }
  }

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.top = "-9999px";
  div.style.left = "-9999px";

  document.body.appendChild(div);

  // Get text up to caret
  const text = textarea.value.substring(0, textarea.selectionStart);
  div.textContent = text;

  // Create a span for the caret position
  const span = document.createElement("span");
  span.textContent = textarea.value.substring(textarea.selectionStart) || ".";
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop,
    left: span.offsetLeft,
    height: span.offsetHeight,
  };

  document.body.removeChild(div);

  return coordinates;
}
