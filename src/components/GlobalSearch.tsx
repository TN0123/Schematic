"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, ClipboardList, Calendar, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearch } from "./SearchProvider";

interface SearchResult {
  id: string;
  title: string;
  type: "document" | "bulletin";
  updatedAt: string;
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

export default function GlobalSearch() {
  const { isSearchOpen: isOpen, openSearch, closeSearch } = useSearch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        openSearch();
      }

      // Escape to close
      if (event.key === "Escape") {
        closeSearch();
        setQuery("");
        setResults([]);
        setSelectedIndex(0);
      }

      // Only handle arrow keys and Enter when search is open
      if (!isOpen) return;

      // Arrow navigation
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + results.length) % results.length
        );
      } else if (event.key === "Enter" && results[selectedIndex]) {
        event.preventDefault();
        handleResultClick(results[selectedIndex]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`
        );
        if (response.ok) {
          const data: SearchResponse = await response.json();

          // Combine and format results
          const combinedResults: SearchResult[] = [
            ...data.documents.map((doc) => ({
              id: doc.id,
              title: doc.title,
              type: "document" as const,
              updatedAt: doc.updatedAt,
            })),
            ...data.bulletins.map((bulletin) => ({
              id: bulletin.id,
              title: bulletin.title,
              type: "bulletin" as const,
              updatedAt: bulletin.updatedAt,
            })),
          ];

          // Sort by update date
          combinedResults.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

          setResults(combinedResults);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "document") {
      router.push(`/write/${result.id}`);
    } else if (result.type === "bulletin") {
      router.push(`/bulletin?noteId=${result.id}`);
    }
    closeSearch();
    setQuery("");
    setResults([]);
    setSelectedIndex(0);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="w-4 h-4 text-purple-500" />;
      case "bulletin":
        return <ClipboardList className="w-4 h-4 text-green-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]"
        onClick={() => closeSearch()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="bg-white dark:bg-dark-paper rounded-xl shadow-2xl border border-gray-200 dark:border-dark-divider w-full max-w-2xl mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-dark-divider">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search documents and notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-gray-900 dark:text-dark-textPrimary placeholder-gray-500 dark:placeholder-gray-400 outline-none text-lg"
            />
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-dark-secondary rounded text-xs">
                ESC
              </kbd>
              <button
                onClick={() => closeSearch()}
                className="p-1 hover:bg-gray-100 dark:hover:bg-dark-hover rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors ${
                      index === selectedIndex
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                    }`}
                  >
                    {getResultIcon(result.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-dark-textPrimary truncate">
                          {result.title}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-dark-textSecondary bg-gray-100 dark:bg-dark-secondary px-2 py-0.5 rounded">
                          {getResultLabel(result.type)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-dark-textSecondary">
                        Updated{" "}
                        {new Date(result.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-dark-textSecondary">
                <Search className="w-8 h-8 mb-2 opacity-50" />
                <p>No results found for "{query}"</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-dark-textSecondary">
                <Search className="w-8 h-8 mb-2 opacity-50" />
                <p>Start typing to search documents and notes...</p>
                <div className="flex items-center gap-2 mt-3 text-sm">
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-dark-secondary rounded text-xs">
                    ↓
                  </kbd>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-dark-secondary rounded text-xs">
                    ↑
                  </kbd>
                  <span>to navigate, </span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-dark-secondary rounded text-xs">
                    ↵
                  </kbd>
                  <span>to select</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
