"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  ClipboardList,
  Clock,
  Loader2,
  X,
  Command,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearch } from "./SearchProvider";

interface SearchResult {
  id: string;
  title: string;
  type: "document" | "bulletin";
  updatedAt: string;
  snippet?: string;
}

interface SearchResponse {
  documents: Array<{
    id: string;
    title: string;
    updatedAt: string;
  }>;
  bulletins: Array<{
    id: string;
    title: string;
    type: string;
    updatedAt: string;
  }>;
}

// Cache for search results
const searchCache = new Map<
  string,
  { results: SearchResult[]; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Recent searches storage
const getRecentSearches = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const recent = localStorage.getItem("recentSearches");
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = (query: string) => {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const recent = getRecentSearches();
    const filtered = recent.filter((s) => s !== query);
    const updated = [query, ...filtered].slice(0, 5); // Keep last 5 searches
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  } catch {
    // Fail silently
  }
};

export default function GlobalSearch() {
  const { isSearchOpen: isOpen, openSearch, closeSearch } = useSearch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showingRecent, setShowingRecent] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Load recent searches when modal opens
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
      setShowingRecent(true);
    }
  }, [isOpen]);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+P or Ctrl+P to open search
      if ((event.metaKey || event.ctrlKey) && event.key === "p") {
        event.preventDefault();
        openSearch();
      }

      // Escape to close
      if (event.key === "Escape") {
        closeSearch();
        resetSearch();
      }

      // Only handle navigation when search is open
      if (!isOpen) return;

      const currentResults = showingRecent ? recentSearches : results;

      // Arrow navigation
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex(
          (prev) => (prev + 1) % Math.max(currentResults.length, 1)
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex(
          (prev) =>
            (prev - 1 + Math.max(currentResults.length, 1)) %
            Math.max(currentResults.length, 1)
        );
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (showingRecent && recentSearches[selectedIndex]) {
          handleRecentSearchClick(recentSearches[selectedIndex]);
        } else if (!showingRecent && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, recentSearches, selectedIndex, showingRecent]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const resetSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
    setShowingRecent(true);
    setIsLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Optimized search with caching and cancellation
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowingRecent(true);
      setIsLoading(false);
      return;
    }

    setShowingRecent(false);

    // Check cache first
    const cachedResult = searchCache.get(query.toLowerCase());
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_DURATION) {
      setResults(cachedResult.results);
      setSelectedIndex(0);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reduced debounce delay for better responsiveness
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      const searchStartTime = performance.now();

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: abortControllerRef.current.signal }
        );

        if (response.ok) {
          const data: SearchResponse = await response.json();
          const searchEndTime = performance.now();
          const responseTime = Math.round(searchEndTime - searchStartTime);

          // Combine and format results with snippets
          const combinedResults: SearchResult[] = [
            ...data.documents.map((doc) => ({
              id: doc.id,
              title: doc.title,
              type: "document" as const,
              updatedAt: doc.updatedAt,
              snippet: doc.title.toLowerCase().includes(query.toLowerCase())
                ? undefined
                : "Document content match...",
            })),
            ...data.bulletins.map((bulletin) => ({
              id: bulletin.id,
              title: bulletin.title,
              type: "bulletin" as const,
              updatedAt: bulletin.updatedAt,
              snippet: bulletin.title
                .toLowerCase()
                .includes(query.toLowerCase())
                ? undefined
                : "Note content match...",
            })),
          ];

          // Sort by relevance (title matches first, then by date)
          combinedResults.sort((a, b) => {
            const aTitle = a.title.toLowerCase().includes(query.toLowerCase());
            const bTitle = b.title.toLowerCase().includes(query.toLowerCase());

            if (aTitle && !bTitle) return -1;
            if (!aTitle && bTitle) return 1;

            return (
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
          });

          setResults(combinedResults);
          setSelectedIndex(0);

          // Cache results
          searchCache.set(query.toLowerCase(), {
            results: combinedResults,
            timestamp: Date.now(),
          });

          // Track search performance
          if (
            typeof window !== "undefined" &&
            (window as any).__updateSearchStats
          ) {
            (window as any).__updateSearchStats(query, responseTime);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Search failed:", error);
        }
      } finally {
        setIsLoading(false);
      }
    }, 150); // Reduced from 300ms to 150ms

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query);

    if (result.type === "document") {
      router.push(`/write/${result.id}`);
    } else if (result.type === "bulletin") {
      router.push(`/bulletin?noteId=${result.id}`);
    }

    closeSearch();
    resetSearch();
  };

  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
    setShowingRecent(false);
    // The useEffect will trigger the search
  };

  const clearRecentSearches = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("recentSearches");
      setRecentSearches([]);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />;
      case "bulletin":
        return (
          <ClipboardList className="w-4 h-4 text-green-500 flex-shrink-0" />
        );
      default:
        return <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />;
    }
  };

  const getResultLabel = (type: string) => {
    switch (type) {
      case "document":
        return "Document";
      case "bulletin":
        return "Note";
      default:
        return "Item";
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4"
        onClick={() => closeSearch()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="bg-white dark:bg-dark-paper rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-divider w-full max-w-2xl mt-[10vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center px-5 py-4 border-b border-gray-200 dark:border-dark-divider">
            <Search className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search documents and notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-gray-900 dark:text-dark-textPrimary placeholder-gray-500 dark:placeholder-gray-400 outline-none text-lg"
              aria-label="Search documents and notes"
              autoComplete="off"
              spellCheck="false"
            />
            <div className="flex items-center gap-2 text-sm text-gray-400">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <kbd className="hidden sm:inline-flex px-2 py-1 bg-gray-100 dark:bg-dark-secondary rounded text-xs font-mono">
                ESC
              </kbd>
              <button
                onClick={() => closeSearch()}
                className="p-1 hover:bg-gray-100 dark:hover:bg-dark-hover rounded transition-colors"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {showingRecent && recentSearches.length > 0 ? (
              <div className="py-2">
                <div className="flex items-center justify-between px-5 py-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-dark-textSecondary">
                    Recent Searches
                  </h3>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((recentQuery, index) => (
                  <button
                    key={recentQuery}
                    onClick={() => handleRecentSearchClick(recentQuery)}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors ${
                      index === selectedIndex && showingRecent
                        ? "bg-gray-100 dark:bg-dark-actionSelected"
                        : ""
                    }`}
                  >
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-dark-textPrimary">
                      {recentQuery}
                    </span>
                  </button>
                ))}
              </div>
            ) : !showingRecent && results.length > 0 ? (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className={`w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors ${
                      index === selectedIndex && !showingRecent
                        ? "bg-gray-100 dark:bg-dark-actionSelected"
                        : ""
                    }`}
                  >
                    {getResultIcon(result.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-dark-textPrimary truncate">
                          {result.title}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-dark-textSecondary bg-gray-100 dark:bg-dark-secondary px-2 py-0.5 rounded-full flex-shrink-0">
                          {getResultLabel(result.type)}
                        </span>
                      </div>
                      {result.snippet && (
                        <p className="text-sm text-gray-500 dark:text-dark-textSecondary mb-1">
                          {result.snippet}
                        </p>
                      )}
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Updated{" "}
                        {new Date(result.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : !showingRecent && query.trim() && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-dark-textSecondary">
                <Search className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-lg font-medium mb-1">No results found</p>
                <p className="text-sm">
                  Try different keywords or check spelling
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-dark-textSecondary">
                <div className="w-12 h-12 mb-3 bg-gray-100 dark:bg-dark-secondary rounded-xl flex items-center justify-center">
                  <Search className="w-6 h-6 opacity-50" />
                </div>
                <p className="text-lg font-medium mb-1">
                  Search your workspace
                </p>
                <p className="text-sm mb-4 text-center">
                  Find documents, notes, and more
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-dark-secondary rounded text-xs font-mono">
                      ↓↑
                    </kbd>
                    <span>navigate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-dark-secondary rounded text-xs font-mono">
                      ↵
                    </kbd>
                    <span>select</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
