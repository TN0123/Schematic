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
  // Check for ADD_TO_END
  const addToEnd = changes["!ADD_TO_END!"];
  
  // Filter out special keys
  const validChanges = Object.entries(changes).filter(
    ([key]) =>
      key !== "!PREPARING!" &&
      key !== "!PARSING_ERROR!" &&
      key !== "!ADD_TO_END!"
  );

  if (validChanges.length === 0 && !addToEnd) {
    return { modifiedText: originalText, diffRanges: [] };
  }

  // Find all occurrences of original text and their positions
  interface ChangeOccurrence {
    originalText: string;
    replacementText: string;
    startIndex: number;
  }

  const occurrences: ChangeOccurrence[] = [];
  const usedIndices = new Set<number>();

  for (const [original, replacement] of validChanges) {
    // Find the index of this occurrence, skipping any already-used positions
    let searchStart = 0;
    let index = -1;
    
    while (searchStart < originalText.length) {
      const foundIndex = originalText.indexOf(original, searchStart);
      if (foundIndex === -1) break;
      
      // Check if this index overlaps with any already-used index
      let overlaps = false;
      for (let i = foundIndex; i < foundIndex + original.length; i++) {
        if (usedIndices.has(i)) {
          overlaps = true;
          break;
        }
      }
      
      if (!overlaps) {
        index = foundIndex;
        // Mark these indices as used
        for (let i = foundIndex; i < foundIndex + original.length; i++) {
          usedIndices.add(i);
        }
        break;
      }
      
      searchStart = foundIndex + 1;
    }
    
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
    const textBefore = originalText.slice(currentIndex, occurrence.startIndex);
    modifiedText += textBefore;

    // Record the position where old text starts
    const oldStart = modifiedText.length;
    
    // Add the old text (what's being replaced)
    modifiedText += occurrence.originalText;
    const oldEnd = modifiedText.length;

    // Record the position where new text starts (right after old text)
    const newStart = modifiedText.length;
    
    // Add the new text (the replacement)
    modifiedText += occurrence.replacementText;
    const newEnd = modifiedText.length;

    diffRanges.push({
      oldStart,
      oldEnd,
      newStart,
      newEnd,
      changeKey: occurrence.originalText,
    });

    // Move current index forward in the original text
    currentIndex = occurrence.startIndex + occurrence.originalText.length;
  }

  // Add remaining text after the last change
  modifiedText += originalText.slice(currentIndex);

  // Handle ADD_TO_END case
  if (addToEnd) {
    // Add a placeholder for "nothing" being replaced at the end
    const oldStart = modifiedText.length;
    const oldEnd = oldStart; // Empty range for the "old" text
    const newStart = modifiedText.length;
    const newEnd = newStart + addToEnd.length;
    modifiedText += addToEnd;

    diffRanges.push({
      oldStart,
      oldEnd,
      newStart,
      newEnd,
      changeKey: "!ADD_TO_END!",
    });
  }


  return { modifiedText, diffRanges };
};

/**
 * Applies diff highlighting to text using DiffRange data.
 * Old text gets red background with strikethrough, new text gets green background.
 * Selected change has brighter colors, unselected changes are more muted.
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
    // Add text before this diff (ensure we don't go past the start of the range)
    const beforeStart = Math.min(currentIndex, range.oldStart);
    const beforeEnd = Math.min(range.oldStart, text.length);
    if (beforeStart < beforeEnd) {
      const beforeText = text.slice(beforeStart, beforeEnd);
      html += escapeHtml(beforeText);
    }

    // Determine if this is the active change
    const isActive = activeChangeKey === range.changeKey;
    
    // Use brighter, more vibrant colors for active change
    // Use muted, darker colors for inactive changes
    const oldTextClasses = isActive
      ? "bg-red-200 dark:bg-red-600/50 line-through"
      : "bg-red-100/60 dark:bg-red-600/35 line-through opacity-60";
    
    const newTextClasses = isActive
      ? "bg-green-200 dark:bg-green-600/50"
      : "bg-green-100/60 dark:bg-green-600/35 opacity-60";

    // Add old text with strikethrough (red background) if there is old text
    if (range.oldStart < range.oldEnd && range.oldEnd <= text.length) {
      const oldText = text.slice(range.oldStart, range.oldEnd);
      html += `<span class="${oldTextClasses}" style="margin:0;padding:0;border:0;display:inline;">${escapeHtml(oldText)}</span>`;
    }

    // Add new text (green background)
    if (range.newStart < range.newEnd && range.newEnd <= text.length) {
      const newText = text.slice(range.newStart, range.newEnd);
      html += `<span class="${newTextClasses}" style="margin:0;padding:0;border:0;display:inline;">${escapeHtml(newText)}</span>`;
      currentIndex = range.newEnd;
    } else {
      // If the new range is invalid, at least move currentIndex forward
      currentIndex = Math.max(currentIndex, range.oldEnd);
    }
  }

  // Add remaining text
  if (currentIndex < text.length) {
    html += escapeHtml(text.slice(currentIndex));
  }

  return html;
};
