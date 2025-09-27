// Utilities for normalizing URLs across the app

export function hasProtocol(url: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(url);
}

export function normalizeUrl(rawUrl: string): string {
  const trimmed = (rawUrl ?? "").trim();
  if (!trimmed) return "";

  if (hasProtocol(trimmed)) return trimmed;

  if (trimmed.startsWith("www.")) {
    return `https://${trimmed}`;
  }

  // If it looks like a domain (contains a dot, no spaces, and not starting with a slash),
  // treat it as a bare domain and prefix https://
  if (/^[^\/\s]+\.[^\/\s]+/.test(trimmed)) {
    return `https://${trimmed}`;
  }

  // Otherwise, return as-is (could be non-URL text or relative path the caller wants)
  return trimmed;
}

export function normalizeUrls(urls?: string[]): string[] | undefined {
  if (!Array.isArray(urls)) return undefined;
  const normalized = urls.map(normalizeUrl).filter((u) => !!u);
  return normalized.length ? normalized : [];
}


