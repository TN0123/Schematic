"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { ChangeHandler } from "./ChangeHandler";
import { Info, AlertCircle, RefreshCw, X, Loader2 } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import {
  useModifierKeyLabel,
  isPrimaryModifierPressed,
} from "@/components/utils/platform";

// Import utilities
import {
  parseApiError,
  handleNetworkError,
  ErrorState,
  escapeHtml,
  getHighlightedHTML,
  getHighlightedHTMLWithRange,
  UndoOperation,
  createTextEditOperation,
  createAcceptSuggestionOperation,
  createAcceptAllSuggestionsOperation,
  createAppendSuggestionOperation,
  Document,
  ChangeMap,
  MobileChangeAPI,
  ModelType,
} from "./utils";

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
  isChatLoading,
  onRegisterMobileChangeAPI,
  onPendingChanges,
  onTitleChange,
  onExport,
  isAutocompleteEnabled,
  onAutocompleteToggle,
}: {
  setInput: (input: string) => void;
  changes: any;
  setSelected: (selected: string) => void;
  onChangesAccepted: () => void;
  userId?: string;
  premiumRemainingUses: number | null;
  setPremiumRemainingUses: (remainingUses: number) => void;
  selectedModel: ModelType;
  currentDocument: Document | null;
  onSaveDocument: () => void;
  isSaving: boolean;
  isImproving: boolean;
  isChatLoading?: boolean;
  onRegisterMobileChangeAPI?: (api: MobileChangeAPI) => void;
  onPendingChanges?: (changes: ChangeMap) => void;
  onTitleChange?: (title: string) => void;
  onExport?: () => void;
  isAutocompleteEnabled?: boolean;
  onAutocompleteToggle?: () => void;
}) {
  const modKeyLabel = useModifierKeyLabel();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
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
  const [tooltipState, setTooltipState] = useState<{
    top: number;
    left: number;
    visible: boolean;
  }>({ top: 0, left: 0, visible: false });
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [suggestion, setSuggestion] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Undo/Redo system
  const [undoStack, setUndoStack] = useState<UndoOperation[]>([]);
  const [redoStack, setRedoStack] = useState<UndoOperation[]>([]);
  const isUndoingRef = useRef(false);
  const isRedoingRef = useRef(false);
  const lastContentRef = useRef<string>("");
  const lastSavedContentForUndoRef = useRef<string>("");
  const textEditTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      // Respect toggle and mobile state
      if (!isAutocompleteEnabled || isMobile) {
        setSuggestion("");
        setAutocompleteError(null);
        return;
      }
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
      lastContentRef.current = currentDocument.content;
      lastSavedContentForUndoRef.current = currentDocument.content;
      // Clear undo and redo stacks when switching documents
      setUndoStack([]);
      setRedoStack([]);
    }
  }, [currentDocument?.id]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Detect mobile devices to disable autocomplete on mobile
  useEffect(() => {
    const detectMobile = () => {
      if (typeof window === "undefined") return;
      const ua = navigator.userAgent || (navigator as any).vendor || "";
      const isTouch = window.matchMedia?.("(pointer: coarse)").matches || false;
      const isSmallViewport = window.innerWidth <= 768;
      const isMobileUA =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          ua
        );
      setIsMobile(isTouch || isMobileUA || isSmallViewport);
    };
    detectMobile();
  }, []);

  // When disabled or on mobile, ensure suggestions are cleared and requests cancelled
  useEffect(() => {
    if (!isAutocompleteEnabled || isMobile) {
      setSuggestion("");
      setAutocompleteError(null);
      debouncedFetchAutocomplete.cancel();
    }
  }, [isAutocompleteEnabled, isMobile, debouncedFetchAutocomplete]);

  // Sync scroll between textarea and overlay
  const handleScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      // Directly manipulate transform for instant, smooth scrolling
      const scrollTop = textareaRef.current.scrollTop;
      const scrollLeft = textareaRef.current.scrollLeft;
      overlayRef.current.style.transform = `translate(-${scrollLeft}px, -${scrollTop}px)`;
    }
  }, []);

  // Initialize overlay transform on mount
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.style.transform = `translate(0px, 0px)`;
    }
  }, []);

  // Watch textarea width changes and update overlay width dynamically
  useEffect(() => {
    if (!textareaRef.current || !overlayRef.current) return;

    const updateOverlayWidth = () => {
      if (textareaRef.current && overlayRef.current) {
        overlayRef.current.style.width = `${textareaRef.current.clientWidth}px`;
      }
    };

    // Initial width set
    updateOverlayWidth();

    // Watch for resize changes
    const resizeObserver = new ResizeObserver(updateOverlayWidth);
    resizeObserver.observe(textareaRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
    } catch (error) {
      console.error("Generation error:", error);
      setLoading(false);
      const errorState = handleNetworkError(error as Error);
      errorState.retryAction = handleContinue;
      setError(errorState);
    }
  };

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (isPrimaryModifierPressed(event) && event.key === "Enter") {
        event.preventDefault();
        handleContinue();
      }
    },
    [handleContinue, setInput]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    // Clear any pending text edit timer
    if (textEditTimerRef.current) {
      clearTimeout(textEditTimerRef.current);
      textEditTimerRef.current = null;
    }

    const lastOperation = undoStack[undoStack.length - 1];
    isUndoingRef.current = true;

    try {
      // Push to redo stack before undoing
      setRedoStack((prev) => [...prev, lastOperation]);

      if (lastOperation.type === "text-edit") {
        // Restore previous text content
        setInputText(lastOperation.previousContent);
        setInput(lastOperation.previousContent);
        lastContentRef.current = lastOperation.previousContent;
        lastSavedContentForUndoRef.current = lastOperation.previousContent;

        // Restore cursor position
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = lastOperation.cursorPosition;
            textareaRef.current.selectionEnd = lastOperation.cursorPosition;
            textareaRef.current.focus();
          }
        }, 0);
      } else if (lastOperation.type === "accept-suggestion") {
        // Restore text before suggestion was accepted
        setInputText(lastOperation.previousContent);
        setInput(lastOperation.previousContent);
        lastContentRef.current = lastOperation.previousContent;
        lastSavedContentForUndoRef.current = lastOperation.previousContent;

        // Restore the suggestion to pending changes
        setPendingChanges((prev) => ({
          ...prev,
          [lastOperation.original]: lastOperation.replacement,
        }));
      } else if (lastOperation.type === "accept-all-suggestions") {
        // Restore text before all suggestions were accepted
        setInputText(lastOperation.previousContent);
        setInput(lastOperation.previousContent);
        lastContentRef.current = lastOperation.previousContent;
        lastSavedContentForUndoRef.current = lastOperation.previousContent;

        // Restore all suggestions to pending changes
        setPendingChanges(lastOperation.acceptedChanges);
      } else if (lastOperation.type === "append-suggestion") {
        // Restore text before appending
        setInputText(lastOperation.previousContent);
        setInput(lastOperation.previousContent);
        lastContentRef.current = lastOperation.previousContent;
        lastSavedContentForUndoRef.current = lastOperation.previousContent;

        // Restore the append suggestion to pending changes
        setPendingChanges((prev) => ({
          ...prev,
          "!ADD_TO_END!": lastOperation.appendedText,
        }));
      }

      // Remove the operation from the undo stack
      setUndoStack((prev) => prev.slice(0, -1));
    } finally {
      // Reset the flag after a short delay to allow the text change to settle
      setTimeout(() => {
        isUndoingRef.current = false;
      }, 50);
    }
  }, [undoStack, setInput]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    // Clear any pending text edit timer
    if (textEditTimerRef.current) {
      clearTimeout(textEditTimerRef.current);
      textEditTimerRef.current = null;
    }

    const lastRedoOperation = redoStack[redoStack.length - 1];
    isRedoingRef.current = true;

    try {
      // Push back to undo stack
      setUndoStack((prev) => [...prev, lastRedoOperation]);

      if (lastRedoOperation.type === "text-edit") {
        // Restore the new text content (redo the edit)
        setInputText(lastRedoOperation.newContent);
        setInput(lastRedoOperation.newContent);
        lastContentRef.current = lastRedoOperation.newContent;
        lastSavedContentForUndoRef.current = lastRedoOperation.newContent;

        // Restore cursor position to end of edit
        setTimeout(() => {
          if (textareaRef.current) {
            const cursorPos = lastRedoOperation.newContent.length;
            textareaRef.current.selectionStart = cursorPos;
            textareaRef.current.selectionEnd = cursorPos;
            textareaRef.current.focus();
          }
        }, 0);
      } else if (lastRedoOperation.type === "accept-suggestion") {
        // Re-apply the suggestion
        setInputText(lastRedoOperation.newContent);
        setInput(lastRedoOperation.newContent);
        lastContentRef.current = lastRedoOperation.newContent;
        lastSavedContentForUndoRef.current = lastRedoOperation.newContent;

        // Remove from pending changes if it's there
        setPendingChanges((prev) => {
          const updated = { ...prev };
          delete updated[lastRedoOperation.original];
          return updated;
        });
      } else if (lastRedoOperation.type === "accept-all-suggestions") {
        // Re-apply all suggestions
        setInputText(lastRedoOperation.newContent);
        setInput(lastRedoOperation.newContent);
        lastContentRef.current = lastRedoOperation.newContent;
        lastSavedContentForUndoRef.current = lastRedoOperation.newContent;

        // Clear pending changes
        setPendingChanges({});
      } else if (lastRedoOperation.type === "append-suggestion") {
        // Re-apply the append
        setInputText(lastRedoOperation.newContent);
        setInput(lastRedoOperation.newContent);
        lastContentRef.current = lastRedoOperation.newContent;
        lastSavedContentForUndoRef.current = lastRedoOperation.newContent;

        // Remove from pending changes if it's there
        setPendingChanges((prev) => {
          const updated = { ...prev };
          delete updated["!ADD_TO_END!"];
          return updated;
        });
      }

      // Remove the operation from the redo stack
      setRedoStack((prev) => prev.slice(0, -1));
    } finally {
      // Reset the flag after a short delay to allow the text change to settle
      setTimeout(() => {
        isRedoingRef.current = false;
      }, 50);
    }
  }, [redoStack, setInput]);

  const applyChange = (original: string, replacement: string) => {
    clearSuggestionAndCancel();

    // Clear any pending text edit timer
    if (textEditTimerRef.current) {
      clearTimeout(textEditTimerRef.current);
      textEditTimerRef.current = null;
    }

    // Record undo operation
    if (!isUndoingRef.current && !isRedoingRef.current) {
      const undoOp = createAcceptSuggestionOperation(
        original,
        replacement,
        inputText,
        inputText.replace(original, replacement)
      );
      setUndoStack((prev) => [...prev, undoOp]);
      // Clear redo stack when new operation is performed
      setRedoStack([]);
    }

    const updated = inputText.replace(original, replacement);
    setInputText(updated);
    setInput(updated);
    lastContentRef.current = updated;
    lastSavedContentForUndoRef.current = updated;
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

    // Clear any pending text edit timer
    if (textEditTimerRef.current) {
      clearTimeout(textEditTimerRef.current);
      textEditTimerRef.current = null;
    }

    // Record undo operation
    if (
      !isUndoingRef.current &&
      !isRedoingRef.current &&
      Object.keys(pendingChanges).length > 0
    ) {
      let updatedText = inputText;
      for (const [original, replacement] of Object.entries(pendingChanges)) {
        if (original === "!ADD_TO_END!") {
          updatedText += replacement;
        } else {
          updatedText = updatedText.replace(original, replacement);
        }
      }

      const undoOp = createAcceptAllSuggestionsOperation(
        inputText,
        updatedText,
        { ...pendingChanges }
      );
      setUndoStack((prev) => [...prev, undoOp]);
      // Clear redo stack when new operation is performed
      setRedoStack([]);
    }

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
    lastContentRef.current = updatedText;
    lastSavedContentForUndoRef.current = updatedText;
    setPendingChanges({});
  };

  const rejectAllChanges = () => {
    clearSuggestionAndCancel();
    setPendingChanges({});
  };

  const appendChange = (newText: string) => {
    clearSuggestionAndCancel();

    // Clear any pending text edit timer
    if (textEditTimerRef.current) {
      clearTimeout(textEditTimerRef.current);
      textEditTimerRef.current = null;
    }

    // Record undo operation
    if (!isUndoingRef.current && !isRedoingRef.current) {
      const undoOp = createAppendSuggestionOperation(
        newText,
        inputText,
        inputText + newText
      );
      setUndoStack((prev) => [...prev, undoOp]);
      // Clear redo stack when new operation is performed
      setRedoStack([]);
    }

    const updatedText = inputText + newText;
    setInputText(updatedText);
    setInput(updatedText);
    lastContentRef.current = updatedText;
    lastSavedContentForUndoRef.current = updatedText;
    const updatedChanges = { ...pendingChanges };
    delete updatedChanges["!ADD_TO_END!"];
    setPendingChanges(updatedChanges);
  };

  // Expose change-handling API to parent (for mobile panel)
  useEffect(() => {
    onRegisterMobileChangeAPI?.({
      applyChange,
      rejectChange,
      appendChange,
      acceptAllChanges,
      rejectAllChanges,
      setActiveHighlight,
    });
  }, [
    onRegisterMobileChangeAPI,
    applyChange,
    rejectChange,
    appendChange,
    acceptAllChanges,
    rejectAllChanges,
    setActiveHighlight,
  ]);

  // Mirror pending changes to parent so mobile panel can render them
  useEffect(() => {
    onPendingChanges?.(pendingChanges);
  }, [pendingChanges, onPendingChanges]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart ?? 0;
    cursorPositionRef.current = cursorPos;

    // Debounced undo recording for text edits
    // Only record after user stops typing for 500ms
    if (!isUndoingRef.current && !isRedoingRef.current) {
      // Clear any existing timer
      if (textEditTimerRef.current) {
        clearTimeout(textEditTimerRef.current);
      }

      // Set a new timer to record the undo operation
      textEditTimerRef.current = setTimeout(() => {
        if (lastSavedContentForUndoRef.current !== newValue) {
          const undoOp = createTextEditOperation(
            lastSavedContentForUndoRef.current,
            newValue,
            cursorPos
          );
          setUndoStack((prev) => [...prev, undoOp]);
          // Clear redo stack when new operation is performed
          setRedoStack([]);
          lastSavedContentForUndoRef.current = newValue;
        }
      }, 500);

      lastContentRef.current = newValue;
    }

    setInput(newValue);
    setInputText(newValue);
    debouncedSaveContent(newValue);
    setGeneratedStart(null);
    setGeneratedEnd(null);

    clearSuggestionAndCancel();
    if (
      cursorPos === newValue.length &&
      newValue.trim().length > 0 &&
      isAutocompleteEnabled &&
      !isMobile
    ) {
      debouncedFetchAutocomplete(newValue);
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  // Keyboard shortcut for undo (Ctrl+Z / Cmd+Z)
  useEffect(() => {
    const handleUndoKeyPress = (event: KeyboardEvent) => {
      if (
        isPrimaryModifierPressed(event) &&
        event.key === "z" &&
        !event.shiftKey
      ) {
        // Only handle if the textarea is focused
        if (document.activeElement === textareaRef.current) {
          event.preventDefault();
          handleUndo();
        }
      }
    };

    document.addEventListener("keydown", handleUndoKeyPress);
    return () => {
      document.removeEventListener("keydown", handleUndoKeyPress);
    };
  }, [handleUndo]);

  // Keyboard shortcut for redo (Ctrl+Y / Cmd+Y)
  useEffect(() => {
    const handleRedoKeyPress = (event: KeyboardEvent) => {
      if (
        isPrimaryModifierPressed(event) &&
        event.key === "y" &&
        !event.shiftKey
      ) {
        // Only handle if the textarea is focused
        if (document.activeElement === textareaRef.current) {
          event.preventDefault();
          handleRedo();
        }
      }
    };

    document.addEventListener("keydown", handleRedoKeyPress);
    return () => {
      document.removeEventListener("keydown", handleRedoKeyPress);
    };
  }, [handleRedo]);

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
    displayHtml += `<span class="text-gray-400 dark:text-gray-500">${escapeHtml(
      suggestion
    )}</span>`;
  }

  return (
    <div className="w-full flex flex-col justify-center items-center h-full">
      {/* Error Banner */}
      {error && (
        <div className="w-full max-w-[1200px] px-4 mb-4 mt-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-dark-secondary border border-red-200 dark:border-dark-divider rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
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
                  className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-dark-actionHover text-red-700 dark:text-red-300 text-xs font-medium rounded hover:bg-red-200 dark:hover:bg-dark-actionSelected transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                  />
                  Retry
                </button>
              )}
              <button
                onClick={() => setError(null)}
                className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-dark-actionHover rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex-1 flex flex-col lg:flex-row items-stretch px-4 pt-4 gap-2 max-w-[1200px] h-full overflow-hidden min-h-0">
        <div
          className={`transition-all duration-500 flex flex-col h-full bg-white dark:bg-dark-paper shadow-xl p-8 border border-gray-100 dark:border-dark-divider overflow-y-auto min-h-0 ${
            Object.keys(pendingChanges).length !== 0 &&
            Object.keys(pendingChanges)[0] !== ""
              ? "flex-[2_2_0%] min-w-0"
              : "flex-[1_1_0%] min-w-0"
          }`}
          id="write-editor"
        >
          <div className="w-full h-full flex flex-col px-2">
            <div className="relative flex-1 min-h-0" ref={editorContainerRef}>
              {tooltipState.visible && (
                <div
                  className="absolute z-20 flex items-center gap-1 px-2 py-1 bg-neutral-800 text-neutral-200 text-xs rounded-md shadow-lg dark:bg-dark-secondary dark:text-dark-textPrimary whitespace-nowrap pointer-events-none"
                  style={{
                    top: tooltipState.top,
                    left: tooltipState.left,
                    transform: "translateX(-50%)",
                  }}
                >
                  <kbd className="font-sans px-1.5 py-0.5 rounded-md bg-neutral-700 text-neutral-200 dark:bg-dark-background dark:text-dark-textPrimary">
                    {modKeyLabel}
                  </kbd>
                  <span>+</span>
                  <kbd className="font-sans px-1.5 py-0.5 rounded-md bg-neutral-700 text-neutral-200 dark:bg-dark-background dark:text-dark-textPrimary">
                    I
                  </kbd>
                  <span className="text-neutral-400 dark:text-dark-textSecondary">
                    to improve
                  </span>
                </div>
              )}
              <div className="w-full h-full relative">
                {/* Overlay for highlights - synced scroll with textarea */}
                <div
                  className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    ref={overlayRef}
                    id="highlight-overlay"
                    className="w-full whitespace-pre-wrap p-6 text-base leading-relaxed text-transparent break-words font-sans box-border"
                    style={{
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      willChange: "transform, width",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: displayHtml,
                    }}
                  />
                </div>
                <div className="absolute top-0 left-4 flex flex-col items-start gap-2 z-10">
                  {selectedModel !== "basic" &&
                    premiumRemainingUses !== null && (
                      <div className="text-xs text-gray-500 dark:text-dark-textSecondary flex items-center gap-1 group relative">
                        <Info className="w-3 h-3 cursor-help" />
                        Premium model uses remaining: {premiumRemainingUses}
                        <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-white dark:bg-dark-secondary rounded shadow-lg text-xs text-gray-600 dark:text-dark-textSecondary opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                          The premium model is used for both {modKeyLabel}+Enter
                          generation and AI sidebar suggestions. If you have 0
                          premium uses left, the system will automatically
                          switch to the default model.
                        </div>
                      </div>
                    )}
                </div>
                <div className="absolute top-0 right-4 flex flex-col items-end gap-2 z-10">
                  {loading && (
                    <div className="text-xs text-gray-500 dark:text-dark-textSecondary">
                      Generating...
                    </div>
                  )}
                  {isImproving && (
                    <div className="text-xs text-gray-500 dark:text-dark-textSecondary flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </div>
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  id="write-editor"
                  className="w-full h-full absolute top-0 left-0 overflow-auto p-6 text-gray-800 dark:text-dark-textPrimary text-base leading-relaxed resize-none outline-none focus:ring-0 bg-transparent whitespace-pre-wrap break-words font-sans box-border"
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                  value={inputText}
                  onChange={handleTextChange}
                  onScroll={handleScroll}
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
                            if (isAutocompleteEnabled && !isMobile) {
                              debouncedFetchAutocomplete(newValue);
                            }
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
                  placeholder="Start typing here..."
                />
              </div>
            </div>
          </div>
        </div>
        <div
          className={`hidden lg:block transition-all duration-500 ease-in-out overflow-hidden self-start h-3/4 ${
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
            isStreaming={false}
          />
        </div>
      </div>
      {/* Mobile assistant tip */}
      {Object.keys(pendingChanges).length !== 0 &&
        Object.keys(pendingChanges)[0] !== "" && (
          <div className="lg:hidden w-full px-4 pb-4">
            <div className="text-xs text-gray-600 dark:text-dark-textSecondary bg-white dark:bg-dark-paper border border-gray-200 dark:border-dark-divider rounded-lg p-3">
              Suggested changes available. Open the assistant below to review.
            </div>
          </div>
        )}
    </div>
  );
}
