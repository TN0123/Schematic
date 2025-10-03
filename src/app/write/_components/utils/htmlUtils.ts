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
