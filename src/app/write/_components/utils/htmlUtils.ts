import { ChangeMap, DiffRange } from "./types";

export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export const getHighlightedHTML = (
  text: string,
  highlight: string | null
): string => {
  if (!highlight) return escapeHtml(text);
  const escapedText = escapeHtml(text);
  const escapedHighlight = escapeHtml(highlight);
  const escapedForRegex = escapedHighlight.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
  const regex = new RegExp(escapedForRegex, "g");
  return escapedText.replace(
    regex,
    `<mark class="bg-yellow-200 dark:bg-yellow-900 dark:text-dark-textPrimary">${escapedHighlight}</mark>`
  );
};

export const getHighlightedHTMLWithRange = (
  text: string,
  start: number | null,
  end: number | null,
  variant: "selection" | "generated" = "generated",
  highlightText?: string
): string => {
  if ((start === null || end === null || start === end) && !highlightText)
    return escapeHtml(text);

  const highlightClass =
    variant === "selection"
      ? "bg-purple-100 dark:bg-purple-900 dark:text-dark-textPrimary"
      : "bg-green-100 text-gray-800 dark:text-dark-textPrimary dark:bg-green-900";

  const before = escapeHtml(text.slice(0, start!));
  const highlight = escapeHtml(text.slice(start!, end!));
  const after = escapeHtml(text.slice(end!));

  if (variant === "selection") {
    return (
      before +
      `<mark id="selection-highlight" class="${highlightClass}">${highlight}</mark>` +
      after
    );
  }

  return (
    before + `<mark class="${highlightClass}">${highlight}</mark>` + after
  );
};

/**
 * Builds modified text with replacement text inserted after original text,
 * and returns the text along with DiffRange data for each change.
 */
export const buildDiffText = (
  originalText: string,
  changes: ChangeMap
): { modifiedText: string; diffRanges: DiffRange[] } => {
  // Filter out special keys
  const validChanges = Object.entries(changes).filter(
    ([key]) =>
      key !== "!PREPARING!" &&
      key !== "!PARSING_ERROR!" &&
      key !== "!ADD_TO_END!"
  );

  if (validChanges.length === 0) {
    return { modifiedText: originalText, diffRanges: [] };
  }

  // Find all occurrences of original text and their positions
  interface ChangeOccurrence {
    originalText: string;
    replacementText: string;
    startIndex: number;
  }

  const occurrences: ChangeOccurrence[] = [];

  for (const [original, replacement] of validChanges) {
    const index = originalText.indexOf(original);
    if (index !== -1) {
      occurrences.push({
        originalText: original,
        replacementText: replacement,
        startIndex: index,
      });
    }
  }

  // Sort by start index (earliest first)
  occurrences.sort((a, b) => a.startIndex - b.startIndex);

  // Build modified text and track ranges
  let modifiedText = "";
  let currentIndex = 0;
  const diffRanges: DiffRange[] = [];

  for (const occurrence of occurrences) {
    // Add text before this change
    modifiedText += originalText.slice(currentIndex, occurrence.startIndex);

    // Add the old text and new text
    const oldStart = modifiedText.length;
    const oldEnd = oldStart + occurrence.originalText.length;
    modifiedText += occurrence.originalText;

    const newStart = modifiedText.length;
    const newEnd = newStart + occurrence.replacementText.length;
    modifiedText += occurrence.replacementText;

    diffRanges.push({
      oldStart,
      oldEnd,
      newStart,
      newEnd,
      changeKey: occurrence.originalText,
    });

    // Move current index forward
    currentIndex = occurrence.startIndex + occurrence.originalText.length;
  }

  // Add remaining text after the last change
  modifiedText += originalText.slice(currentIndex);

  return { modifiedText, diffRanges };
};

/**
 * Applies diff highlighting to text using DiffRange data.
 * Old text gets red background with strikethrough, new text gets green background.
 */
export const getDiffHighlightedHTML = (
  text: string,
  diffRanges: DiffRange[],
  activeChangeKey: string | null
): string => {
  if (diffRanges.length === 0) {
    return escapeHtml(text);
  }

  // Sort ranges by start position
  const sortedRanges = [...diffRanges].sort((a, b) => a.oldStart - b.oldStart);

  let html = "";
  let currentIndex = 0;

  for (const range of sortedRanges) {
    // Add text before this diff
    html += escapeHtml(text.slice(currentIndex, range.oldStart));

    // Determine if this is the active change
    const isActive = activeChangeKey === range.changeKey;
    const borderClass = isActive ? "border" : "";

    // Add old text with strikethrough (red background)
    const oldText = escapeHtml(text.slice(range.oldStart, range.oldEnd));
    html += `<span class="bg-red-100 dark:bg-red-500/30 ${borderClass}">${oldText}</span>`;

    // Add new text (green background)
    const newText = escapeHtml(text.slice(range.newStart, range.newEnd));
    html += `<span class="bg-green-100 dark:bg-green-500/30 ${borderClass}">${newText}</span>`;

    currentIndex = range.newEnd;
  }

  // Add remaining text
  html += escapeHtml(text.slice(currentIndex));

  return html;
};
