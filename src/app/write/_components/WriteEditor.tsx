"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { ChangeHandler } from "./ChangeHandler";
import {
  Info,
  FileUp,
  FileText,
  Loader2,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import { useDebouncedCallback } from "use-debounce";
import Link from "next/link";

export type ChangeMap = Record<string, string>;

interface Document {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  userId: string;
}

interface ErrorState {
  message: string;
  type: "network" | "server" | "auth" | "validation" | "unknown";
  canRetry: boolean;
  retryAction?: () => void;
}

interface ToastNotification {
  id: string;
  message: string;
  type: "error" | "success" | "warning" | "info";
  duration?: number;
}

export default function WriteEditor({
  setInput,
  changes,
  setSelected,
  onChangesAccepted,
  userId,
  premiumRemainingUses,
  setPremiumRemainingUses,
  selectedModel,
  currentDocument,
  onSaveDocument,
  isSaving,
  isImproving,
}: {
  setInput: (input: string) => void;
  changes: any;
  setSelected: (selected: string) => void;
  onChangesAccepted: () => void;
  userId?: string;
  premiumRemainingUses: number | null;
  setPremiumRemainingUses: (remainingUses: number) => void;
  selectedModel: "auto" | "basic" | "premium";
  currentDocument: Document | null;
  onSaveDocument: () => void;
  isSaving: boolean;
  isImproving: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [inputText, setInputText] = useState("");
  const [pendingChanges, setPendingChanges] = useState<ChangeMap>({});
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [autocompleteError, setAutocompleteError] = useState<string | null>(
    null
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);
  const [generatedStart, setGeneratedStart] = useState<number | null>(null);
  const [generatedEnd, setGeneratedEnd] = useState<number | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [title, setTitle] = useState(
    currentDocument?.title || "Untitled Document"
  );
  const [tooltipState, setTooltipState] = useState<{
    top: number;
    left: number;
    visible: boolean;
  }>({ top: 0, left: 0, visible: false });
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [suggestion, setSuggestion] = useState("");

  // Helper function to add toast notifications
  const addToast = (
    message: string,
    type: ToastNotification["type"] = "error",
    duration = 5000
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: ToastNotification = { id, message, type, duration };
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  };

  // Helper function to remove toast
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper function to parse API errors
  const parseApiError = async (response: Response): Promise<ErrorState> => {
    let message = "An unexpected error occurred";
    let type: ErrorState["type"] = "unknown";
    let canRetry = false;

    try {
      const errorData = await response.json();
      message = errorData.error || errorData.message || message;
    } catch {
      // If we can't parse the error response, use status-based messages
      switch (response.status) {
        case 400:
          message = "Invalid request. Please check your input and try again.";
          type = "validation";
          break;
        case 401:
          message = "Authentication required. Please log in and try again.";
          type = "auth";
          break;
        case 403:
          message = "Access denied. You may have reached your usage limit.";
          type = "auth";
          break;
        case 429:
          message = "Too many requests. Please wait a moment and try again.";
          type = "server";
          canRetry = true;
          break;
        case 500:
          message = "Server error. Please try again in a moment.";
          type = "server";
          canRetry = true;
          break;
        case 503:
          message = "Service temporarily unavailable. Please try again later.";
          type = "server";
          canRetry = true;
          break;
        default:
          message = `Request failed with status ${response.status}`;
          type = "server";
          canRetry = response.status >= 500;
      }
    }

    return { message, type, canRetry };
  };

  // Helper function to handle network errors
  const handleNetworkError = (error: Error): ErrorState => {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      return {
        message:
          "Network connection failed. Please check your internet connection and try again.",
        type: "network",
        canRetry: true,
      };
    }

    return {
      message: error.message || "An unexpected error occurred",
      type: "unknown",
      canRetry: false,
    };
  };

  // Debounced save for content
  const debouncedSaveContent = useDebouncedCallback((newContent: string) => {
    if (currentDocument && newContent !== currentDocument.content) {
      setIsSavingContent(true);
      // Call onSaveDocument to trigger the save
      onSaveDocument();
      // Reset saving indicator after a short delay
      setTimeout(() => setIsSavingContent(false), 500);
    }
  }, 1000);

  const debouncedFetchAutocomplete = useDebouncedCallback(
    async (text: string) => {
      if (
        !text.trim() ||
        textareaRef.current?.selectionStart !== text.length ||
        text.length < 10
      ) {
        setSuggestion("");
        setAutocompleteError(null);
        return;
      }

      try {
        setAutocompleteError(null);
        const response = await fetch("/api/autocomplete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ currentText: text }),
        });

        if (!response.ok) {
          const errorState = await parseApiError(response);
          setAutocompleteError(errorState.message);
          setSuggestion("");

          // Only show toast for serious errors, not rate limiting or temporary issues
          if (errorState.type === "auth" || errorState.type === "validation") {
            addToast(
              `Autocomplete error: ${errorState.message}`,
              "warning",
              3000
            );
          }
          return;
        }

        const data = await response.json();
        let newSuggestion = data.result || "";

        if (inputText.endsWith(" ") && newSuggestion.startsWith(" ")) {
          newSuggestion = newSuggestion.substring(1);
        }

        if (newSuggestion) {
          setSuggestion(newSuggestion);
        } else {
          setSuggestion("");
        }
      } catch (error) {
        console.error("Autocomplete error:", error);
        const errorState = handleNetworkError(error as Error);
        setAutocompleteError(errorState.message);
        setSuggestion("");

        // Only show toast for network errors
        if (errorState.type === "network") {
          addToast(
            `Autocomplete unavailable: ${errorState.message}`,
            "warning",
            3000
          );
        }
      }
    },
    300
  );

  useEffect(() => {
    return () => {
      debouncedFetchAutocomplete.cancel();
    };
  }, [debouncedFetchAutocomplete]);

  // Add effect to sync input with document content
  useEffect(() => {
    if (currentDocument) {
      setInputText(currentDocument.content);
    }
  }, [currentDocument?.id]);

  const updateTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    updateTextareaHeight();
  }, [inputText]);

  useEffect(() => {
    if (isImproving) {
      setTooltipState((p) => ({ ...p, visible: false }));
      setSelectionStart(null);
      setSelectionEnd(null);
      if (textareaRef.current) {
        const selectionEnd = textareaRef.current.selectionEnd;
        textareaRef.current.selectionStart = selectionEnd;
      }
      clearSuggestionAndCancel();
    }
  }, [isImproving]);

  useEffect(() => {
    if (changes && Object.keys(changes).length > 0) {
      setPendingChanges(changes);
      setTooltipState((p) => ({ ...p, visible: false }));
    }
  }, [changes]);

  useEffect(() => {
    if (Object.keys(pendingChanges).length === 0) {
      setActiveHighlight(null);
      onChangesAccepted();
    }
  }, [pendingChanges]);

  useEffect(() => {
    setTitle(currentDocument?.title || "Untitled Document");
  }, [currentDocument?.id]);

  // Debounced save for title
  const debouncedSaveTitle = useDebouncedCallback((newTitle: string) => {
    if (currentDocument && newTitle !== currentDocument.title) {
      // Update the document with new title
      currentDocument.title = newTitle;
      onSaveDocument();
    }
  }, 800);

  useLayoutEffect(() => {
    if (
      selectionStart !== null &&
      selectionEnd !== null &&
      selectionStart !== selectionEnd
    ) {
      const highlightElement = document.getElementById("selection-highlight");
      if (highlightElement && editorContainerRef.current) {
        const highlightRect = highlightElement.getBoundingClientRect();
        const containerRect =
          editorContainerRef.current.getBoundingClientRect();

        const top = highlightRect.top - containerRect.top - 35; // Position above the highlight
        const left =
          highlightRect.left - containerRect.left + highlightRect.width / 2;

        setTooltipState({
          top,
          left,
          visible: true,
        });
        return;
      }
    }
    setTooltipState((p) => ({ ...p, visible: false }));
  }, [selectionStart, selectionEnd, inputText]);

  const clearSuggestionAndCancel = () => {
    setSuggestion("");
    setAutocompleteError(null);
    debouncedFetchAutocomplete.cancel();
  };

  const handleContinue = async () => {
    try {
      setError(null);
      clearSuggestionAndCancel();
      const liveCursor =
        textareaRef.current?.selectionStart ?? inputText.length;

      cursorPositionRef.current = liveCursor;

      const before = inputText.slice(0, cursorPositionRef.current);
      const after = inputText.slice(cursorPositionRef.current);

      cursorPositionRef.current = liveCursor;
      setLoading(true);
      setSelectionStart(null);
      setSelectionEnd(null);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startText: `${before}`,
          endText: `${after}`,
          userId,
          model: selectedModel,
        }),
      });

      setLoading(false);

      if (!response.ok) {
        const errorState = await parseApiError(response);
        errorState.retryAction = handleContinue;
        setError(errorState);
        addToast(errorState.message, "error");
        return;
      }

      const data = await response.json();
      const { text: generatedText, remainingUses } = data.result;

      const updated = before + generatedText + after;
      const start = before.length;
      const end = start + generatedText.length;

      setInputText(updated);
      cursorPositionRef.current = end;
      setGeneratedStart(start);
      setGeneratedEnd(end);

      // Update remaining uses if provided
      if (remainingUses !== null) {
        setPremiumRemainingUses(remainingUses);
      }

      // Show success feedback for generation
      addToast("Content generated successfully!", "success", 2000);
    } catch (error) {
      console.error("Generation error:", error);
      setLoading(false);
      const errorState = handleNetworkError(error as Error);
      errorState.retryAction = handleContinue;
      setError(errorState);
      addToast(errorState.message, "error");
    }
  };

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        handleContinue();
      }
    },
    [handleContinue, setInput]
  );

  const applyChange = (original: string, replacement: string) => {
    clearSuggestionAndCancel();
    const updated = inputText.replace(original, replacement);
    setInputText(updated);
    setInput(updated);
    const updatedChanges = { ...pendingChanges };
    delete updatedChanges[original];
    setPendingChanges(updatedChanges);
  };

  const rejectChange = (original: string) => {
    clearSuggestionAndCancel();
    const updatedChanges = { ...pendingChanges };
    delete updatedChanges[original];
    setPendingChanges(updatedChanges);
  };

  const acceptAllChanges = () => {
    clearSuggestionAndCancel();
    let updatedText = inputText;
    for (const [original, replacement] of Object.entries(pendingChanges)) {
      if (original === "!ADD_TO_END!") {
        updatedText += replacement;
      } else {
        updatedText = updatedText.replace(original, replacement);
      }
    }
    setInputText(updatedText);
    setInput(updatedText);
    setPendingChanges({});
  };

  const rejectAllChanges = () => {
    clearSuggestionAndCancel();
    setPendingChanges({});
  };

  const handleExport = () => {
    if (!inputText.trim()) {
      addToast("Please add some content before exporting.", "warning");
      return;
    }

    try {
      // Create new PDF document
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Set up Google Docs-style formatting
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 25.4; // 1 inch margins like Google Docs
      const lineHeight = 6; // Line spacing
      const fontSize = 11; // Standard document font size

      pdf.setFont("times", "normal");
      pdf.setFontSize(fontSize);

      // Split text into lines that fit within margins
      const maxWidth = pageWidth - margin * 2;
      const lines = pdf.splitTextToSize(inputText, maxWidth);

      let yPosition = margin;
      let currentPage = 1;

      // Add lines to PDF, handling page breaks
      for (let i = 0; i < lines.length; i++) {
        // Check if we need a new page
        if (yPosition + lineHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          currentPage++;
        }

        pdf.text(lines[i], margin, yPosition);
        yPosition += lineHeight;
      }

      // Generate filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, "");
      const filename = `document_${timestamp}.pdf`;

      // Download the PDF
      pdf.save(filename);
      addToast("PDF exported successfully!", "success", 2000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      addToast("Failed to generate PDF. Please try again.", "error");
    }
  };

  const appendChange = (newText: string) => {
    clearSuggestionAndCancel();
    const updatedText = inputText + newText;
    setInputText(updatedText);
    setInput(updatedText);
    const updatedChanges = { ...pendingChanges };
    delete updatedChanges["!ADD_TO_END!"];
    setPendingChanges(updatedChanges);
  };

  const getHighlightedHTML = (
    text: string,
    highlight: string | null
  ): string => {
    if (!highlight) return text;
    const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "g");
    return text.replace(
      regex,
      `<mark class="bg-yellow-200 dark:bg-yellow-900 dark:text-dark-textPrimary">${highlight}</mark>`
    );
  };

  const getHighlightedHTMLWithRange = (
    text: string,
    start: number | null,
    end: number | null,
    variant: "selection" | "generated" = "generated",
    highlightText?: string
  ): string => {
    if ((start === null || end === null || start === end) && !highlightText)
      return text;

    const highlightClass =
      variant === "selection"
        ? "bg-purple-100 dark:bg-purple-900 dark:text-dark-textPrimary"
        : "bg-green-100 text-gray-800 dark:text-dark-textPrimary dark:bg-green-900";

    const before = text.slice(0, start!);
    const highlight = text.slice(start!, end!);
    const after = text.slice(end!);

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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart ?? 0;
    cursorPositionRef.current = cursorPos;
    setInput(newValue);
    setInputText(newValue);
    debouncedSaveContent(newValue);
    setGeneratedStart(null);
    setGeneratedEnd(null);
    updateTextareaHeight();

    clearSuggestionAndCancel();
    if (cursorPos === newValue.length && newValue.trim().length > 0) {
      debouncedFetchAutocomplete(newValue);
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    if (
      textareaRef.current &&
      generatedStart !== null &&
      generatedEnd !== null
    ) {
      textareaRef.current.selectionStart = generatedEnd;
      textareaRef.current.selectionEnd = generatedEnd;
      textareaRef.current.focus();
    }
  }, [inputText, generatedStart, generatedEnd]);

  let displayHtml: string;

  if (activeHighlight !== null) {
    displayHtml = getHighlightedHTML(inputText, activeHighlight);
  } else if (
    selectionStart !== null &&
    selectionEnd !== null &&
    selectionStart !== selectionEnd
  ) {
    displayHtml = getHighlightedHTMLWithRange(
      inputText,
      selectionStart,
      selectionEnd,
      "selection"
    );
  } else {
    displayHtml = getHighlightedHTMLWithRange(
      inputText,
      generatedStart,
      generatedEnd,
      "generated"
    );
  }

  if (suggestion) {
    displayHtml += `<span class="text-gray-400 dark:text-gray-500">${suggestion}</span>`;
  }

  return (
    <div className="w-full flex flex-col justify-center items-center h-full">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border min-w-[300px] max-w-[400px] transition-all duration-300 ${
              toast.type === "error"
                ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
                : toast.type === "success"
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
                : toast.type === "warning"
                ? "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200"
                : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200"
            }`}
          >
            {toast.type === "error" && (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            {toast.type === "success" && (
              <FileText className="w-5 h-5 flex-shrink-0" />
            )}
            {toast.type === "warning" && (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            {toast.type === "info" && (
              <Info className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="w-full max-w-[1200px] flex items-center justify-between py-4 px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/write"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700/50 shadow-sm hover:shadow-md hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-800/30 dark:hover:to-indigo-800/30 text-sm font-medium text-purple-700 dark:text-purple-200 transition-all duration-200 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Documents
          </Link>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-600"></div>
          <div className="flex items-center gap-2 w-[400px]">
            <FileText className="w-5 h-5 dark:text-gray-400" />
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                debouncedSaveTitle(e.target.value);
              }}
              className="text-lg w-full font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-dark-textPrimary text-ellipsis overflow-hidden"
              placeholder="Untitled Document"
            />
            {(isSaving || isSavingContent) && (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center bg-gray-50 dark:bg-dark-secondary gap-2 px-4 py-2 text-xs border border-gray-200 dark:border-dark-divider rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all duration-200 font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:shadow-md"
        >
          Export
          <FileUp className="w-4 h-4" />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="w-full max-w-[1200px] px-4 mb-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {error.message}
              </p>
              {error.type === "network" && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Check your internet connection and try again.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {error.canRetry && error.retryAction && (
                <button
                  onClick={error.retryAction}
                  disabled={loading}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-200 text-xs font-medium rounded hover:bg-red-200 dark:hover:bg-red-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                  />
                  Retry
                </button>
              )}
              <button
                onClick={() => setError(null)}
                className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/50 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex-1 flex flex-row items-stretch px-4 gap-2 max-w-[1200px] h-[calc(100vh-80px)]">
        <div
          className={`transition-all duration-500 flex flex-col h-full bg-white dark:bg-neutral-900 shadow-xl p-8 border border-gray-100 dark:border-dark-divider overflow-y-scroll ${
            Object.keys(pendingChanges).length !== 0 &&
            Object.keys(pendingChanges)[0] !== ""
              ? "flex-[2_2_0%] min-w-0"
              : "flex-[1_1_0%] min-w-0"
          }`}
          id="write-editor"
        >
          <div className="w-full flex flex-col gap-6 px-2">
            <div className="relative" ref={editorContainerRef}>
              {tooltipState.visible && (
                <div
                  className="absolute z-20 flex items-center gap-1 px-2 py-1 bg-neutral-800 text-neutral-200 text-xs rounded-md shadow-lg dark:bg-neutral-800 dark:text-neutral-200 whitespace-nowrap pointer-events-none"
                  style={{
                    top: tooltipState.top,
                    left: tooltipState.left,
                    transform: "translateX(-50%)",
                  }}
                >
                  <kbd className="font-sans px-1.5 py-0.5 rounded-md bg-neutral-700 text-neutral-200">
                    Ctrl
                  </kbd>
                  <span>+</span>
                  <kbd className="font-sans px-1.5 py-0.5 rounded-md bg-neutral-700 text-neutral-200">
                    I
                  </kbd>
                  <span className="text-neutral-400">to improve</span>
                </div>
              )}
              <div className="w-full overflow-hidden min-h-48 p-6 text-gray-800 dark:text-dark-textPrimary text-base leading-relaxed">
                <div
                  className="absolute top-0 left-0 w-full h-full pointer-events-none whitespace-pre-wrap p-6 text-base leading-relaxed text-transparent break-words"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{
                    __html: displayHtml,
                  }}
                />
                <div className="absolute top-0 left-4 flex flex-col items-start gap-2 z-10">
                  {selectedModel !== "basic" &&
                    premiumRemainingUses !== null &&
                    userId !== "cm6qw1jxy0000unao2h2rz83l" &&
                    userId !== "cma8kzffi0000unysbz2awbmf" && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 group relative">
                        <Info className="w-3 h-3 cursor-help" />
                        Premium model uses remaining: {premiumRemainingUses}
                        <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-white dark:bg-neutral-800 rounded shadow-lg text-xs text-gray-600 dark:text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                          The premium model is used for both Ctrl+Enter
                          generation and AI sidebar suggestions. If you have 0
                          premium uses left, the system will automatically
                          switch to the default model.
                        </div>
                      </div>
                    )}
                  {selectedModel !== "basic" &&
                    (userId === "cm6qw1jxy0000unao2h2rz83l" ||
                      userId === "cma8kzffi0000unysbz2awbmf") && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 group relative">
                        <Info className="w-3 h-3 cursor-help" />
                        Premium model active
                        <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-white dark:bg-neutral-800 rounded shadow-lg text-xs text-gray-600 dark:text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                          The premium model is used for both Ctrl+Enter
                          generation and AI sidebar suggestions. You are a
                          premium user with unlimited uses.
                        </div>
                      </div>
                    )}
                  {autocompleteError && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Autocomplete temporarily unavailable
                    </div>
                  )}
                </div>
                <div className="absolute top-0 right-4 flex flex-col items-end gap-2 z-10">
                  {loading && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Generating...
                    </div>
                  )}
                  {isImproving && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </div>
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  id="write-editor"
                  className="w-full h-full absolute top-0 left-0 overflow-hidden p-6 text-gray-800 dark:text-dark-textPrimary text-base leading-relaxed resize-none outline-none focus:ring-0 bg-transparent"
                  value={inputText}
                  onChange={handleTextChange}
                  onSelect={(e) => {
                    const textarea = e.currentTarget;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;

                    if (
                      start !== inputText.length ||
                      end !== inputText.length
                    ) {
                      setSuggestion("");
                    }

                    cursorPositionRef.current = start;
                    setSelectionStart(start);
                    setSelectionEnd(end);

                    const selected = textarea.value.substring(start, end);
                    setSelected(selected);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      if (suggestion) {
                        e.preventDefault();
                        const newValue = inputText + suggestion;
                        setInputText(newValue);
                        setInput(newValue);
                        debouncedSaveContent(newValue);

                        clearSuggestionAndCancel();

                        setTimeout(() => {
                          if (textareaRef.current) {
                            textareaRef.current.selectionStart =
                              textareaRef.current.selectionEnd =
                                newValue.length;
                            debouncedFetchAutocomplete(newValue);
                          }
                        }, 0);
                      } else {
                        e.preventDefault();
                        const textarea = textareaRef.current;
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const newValue =
                            inputText.substring(0, start) +
                            "\t" +
                            inputText.substring(end);
                          setInputText(newValue);
                          setInput(newValue);
                          cursorPositionRef.current = start + 1;
                          setTimeout(() => {
                            textarea.selectionStart = textarea.selectionEnd =
                              start + 1;
                          }, 0);
                        }
                      }
                    }
                  }}
                  onInput={updateTextareaHeight}
                  placeholder="Start typing here..."
                />
              </div>
            </div>
          </div>
        </div>
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden self-start h-3/4 ${
            Object.keys(pendingChanges).length !== 0 &&
            Object.keys(pendingChanges)[0] !== ""
              ? "flex-[1_1_0%] max-w-[350px] opacity-100 translate-x-0"
              : "flex-[0_0_0%] max-w-0 opacity-0 -translate-x-10"
          }`}
        >
          <ChangeHandler
            changes={pendingChanges}
            applyChange={applyChange}
            rejectChange={rejectChange}
            appendChange={appendChange}
            acceptAllChanges={acceptAllChanges}
            rejectAllChanges={rejectAllChanges}
            setActiveHighlight={setActiveHighlight}
          />
        </div>
      </div>
    </div>
  );
}
